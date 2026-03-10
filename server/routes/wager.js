const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAgentAuth } = require('../middleware/auth');

const ENTRY_FEES = [10, 50, 100];

// Multipliers after house edge baked in (house always profits on average)
const PAYOUT_MULTIPLIERS = { 10: 1.7, 50: 1.8, 100: 2.0 };

// POST /wager/enter  — called when party is formed, before run starts
// Body: { run_id, agent_ids: [1,2,3], entry_fee: 10|50|100 }
router.post('/enter', requireAgentAuth, (req, res) => {
  const { run_id, agent_ids, entry_fee } = req.body;
  if (!run_id || !agent_ids || !entry_fee) {
    return res.status(400).json({ error: 'run_id, agent_ids, and entry_fee required' });
  }
  if (!ENTRY_FEES.includes(Number(entry_fee))) {
    return res.status(400).json({ error: 'entry_fee must be 10, 50, or 100' });
  }
  const fee = Number(entry_fee);

  // Check all agents have enough gold
  const agents = agent_ids.map(id => db.prepare('SELECT * FROM agents WHERE id = ?').get(id));
  const broke = agents.find(a => !a || (a.gold - a.gold_locked) < fee);
  if (broke) {
    return res.status(400).json({ error: `Agent ${broke.name || broke.id} cannot afford the entry fee of ${fee}g` });
  }

  const enterWagers = db.transaction(() => {
    for (const agent of agents) {
      // Lock gold (escrow)
      db.prepare('UPDATE agents SET gold_locked = gold_locked + ? WHERE id = ?').run(fee, agent.id);
      // Create pending wager
      db.prepare('INSERT INTO wagers (run_id, agent_id, amount, status) VALUES (?, ?, ?, ?)').run(run_id, agent.id, fee, 'pending');
    }
  });

  enterWagers();
  res.json({ ok: true, run_id, entry_fee: fee, agents_entered: agents.length });
});

// POST /wager/settle  — called internally when run ends
// Body: { run_id, outcome: 'victory'|'defeat', difficulty: 1-5 }
router.post('/settle', (req, res) => {
  const { run_id, outcome, difficulty } = req.body;
  if (!run_id || !outcome) return res.status(400).json({ error: 'run_id and outcome required' });

  const wagers = db.prepare("SELECT * FROM wagers WHERE run_id = ? AND status = 'pending'").all(run_id);
  if (!wagers.length) return res.json({ ok: true, message: 'No pending wagers for this run' });

  const settle = db.transaction(() => {
    const results = [];

    for (const wager of wagers) {
      const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(wager.agent_id);

      if (outcome === 'defeat') {
        // Agent loses their locked gold
        db.prepare('UPDATE agents SET gold_locked = gold_locked - ?, gold = gold - ? WHERE id = ?')
          .run(wager.amount, wager.amount, wager.agent_id);
        db.prepare("UPDATE wagers SET status = 'lost', payout = 0 WHERE id = ?").run(wager.id);

        // House books it: 90% to ledger, 10% seeds jackpot
        const jackpotSeed = Math.floor(wager.amount * 0.1);
        const houseKeep = wager.amount - jackpotSeed;
        db.prepare("INSERT INTO house_ledger (run_id, type, amount) VALUES (?, 'loss', ?)").run(run_id, houseKeep);
        db.prepare("INSERT INTO house_ledger (run_id, type, amount) VALUES (?, 'jackpot_seed', ?)").run(run_id, jackpotSeed);
        db.prepare('UPDATE jackpot_pool SET balance = balance + ? WHERE id = 1').run(jackpotSeed);
        results.push({ agent_id: wager.agent_id, outcome: 'lost', gold_change: -wager.amount });

      } else if (outcome === 'victory') {
        const multiplier = PAYOUT_MULTIPLIERS[wager.amount] || 1.7;
        const payout = Math.floor(wager.amount * multiplier);
        const profit = payout - wager.amount;

        // Unlock gold and credit payout
        db.prepare('UPDATE agents SET gold_locked = gold_locked - ?, gold = gold + ? WHERE id = ?')
          .run(wager.amount, profit, wager.agent_id);
        db.prepare("UPDATE wagers SET status = 'won', payout = ? WHERE id = ?").run(payout, wager.id);

        // House books the rake (difference between fair odds and actual payout)
        const fairPayout = Math.floor(wager.amount * 2.0);
        const rake = fairPayout - payout;
        if (rake > 0) {
          db.prepare("INSERT INTO house_ledger (run_id, type, amount) VALUES (?, 'rake', ?)").run(run_id, rake);
        }

        results.push({ agent_id: wager.agent_id, outcome: 'won', gold_change: profit, payout });
      }
    }

    // Jackpot roll: 3% chance, pool must be >= 50g
    let jackpotTriggered = false;
    let jackpotPayout = 0;
    if (outcome === 'victory') {
      const pool = db.prepare('SELECT balance FROM jackpot_pool WHERE id = 1').get();
      if (pool.balance >= 50 && Math.random() < 0.03) {
        jackpotTriggered = true;
        jackpotPayout = Math.floor(pool.balance / 2);
        const share = Math.floor(jackpotPayout / wagers.length);
        for (const wager of wagers) {
          db.prepare('UPDATE agents SET gold = gold + ? WHERE id = ?').run(share, wager.agent_id);
        }
        db.prepare('UPDATE jackpot_pool SET balance = balance - ? WHERE id = 1').run(jackpotPayout);
        db.prepare("INSERT INTO house_ledger (run_id, type, amount) VALUES (?, 'jackpot_payout', ?)").run(run_id, jackpotPayout);
      }
    }

    return { results, jackpotTriggered, jackpotPayout };
  });

  const result = settle();
  res.json({ ok: true, run_id, outcome, ...result });
});

// GET /wager/status/:run_id
router.get('/status/:run_id', (req, res) => {
  const { run_id } = req.params;
  const run = db.prepare('SELECT * FROM dungeon_runs WHERE run_id = ?').get(run_id);
  if (!run) return res.status(404).json({ error: 'Run not found' });

  const wagers = db.prepare('SELECT w.*, a.name FROM wagers w JOIN agents a ON a.id = w.agent_id WHERE w.run_id = ?').all(run_id);
  const pool = db.prepare('SELECT balance FROM jackpot_pool WHERE id = 1').get();
  const entryFee = wagers[0]?.amount || 0;
  const multiplier = PAYOUT_MULTIPLIERS[entryFee] || 1.7;
  const potentialPayout = Math.floor(entryFee * multiplier);

  res.json({
    run_id,
    entry_fee: entryFee,
    pot_size: wagers.reduce((sum, w) => sum + w.amount, 0),
    potential_payout: potentialPayout,
    jackpot_pool: pool?.balance || 0,
    jackpot_odds: '3%',
    wagers: wagers.map(w => ({ agent_id: w.agent_id, name: w.name, amount: w.amount, status: w.status, payout: w.payout }))
  });
});

module.exports = router;