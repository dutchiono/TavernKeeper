const express = require('express');
const router = express.Router();
const db = require('../db');
const { processAction } = require('../engine/dungeon');
const { requireAgentAuth } = require('../middleware/auth');

// GET /dungeon/state/:run_id  (public - observers can watch)
router.get('/state/:run_id', (req, res) => {
  const run = db.prepare('SELECT * FROM dungeon_runs WHERE run_id = ?').get(req.params.run_id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  const members = db.prepare(`
    SELECT a.id, a.name, a.class, a.hp, a.max_hp
    FROM agents a JOIN party_members pm ON pm.agent_id = a.id WHERE pm.party_id = ?
  `).all(run.party_id);
  const log = JSON.parse(run.log);
  const lastEntry = log.filter(e => e.type !== 'state').slice(-1)[0] || null;
  res.json({
    run_id: run.run_id, status: run.status, current_room: run.current_room,
    total_rooms: run.total_rooms, party: members, last_narration: lastEntry, outcome: run.outcome
  });
});

// GET /dungeon/log/:run_id  (public - full log for observers)
router.get('/log/:run_id', (req, res) => {
  const run = db.prepare('SELECT * FROM dungeon_runs WHERE run_id = ?').get(req.params.run_id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  const log = JSON.parse(run.log).filter(e => e.type !== 'state');
  res.json({ run_id: run.run_id, status: run.status, outcome: run.outcome, log });
});

// POST /dungeon/action  (requires X-Agent-Key)
router.post('/action', requireAgentAuth, async (req, res) => {
  const { run_id, action, flavor_text } = req.body;
  const agent_id = req.agent.id;
  if (!run_id || !action) return res.status(400).json({ error: 'run_id and action required' });
  const run = db.prepare('SELECT * FROM dungeon_runs WHERE run_id = ?').get(run_id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  if (run.status !== 'active') return res.status(400).json({ error: 'Run is not active' });
  const result = await processAction({ run, agent_id, action, flavor_text });

  // If run just completed, settle wagers
  if (result.status && result.status !== 'active') {
    try {
      const outcome = result.outcome === 'victory' ? 'victory' : 'defeat';
      const settle = db.transaction(() => {
        const wagers = db.prepare("SELECT * FROM wagers WHERE run_id = ? AND status = 'pending'").all(run_id);
        for (const wager of wagers) {
          if (outcome === 'defeat') {
            db.prepare('UPDATE agents SET gold_locked = gold_locked - ?, gold = gold - ? WHERE id = ?')
              .run(wager.amount, wager.amount, wager.agent_id);
            db.prepare("UPDATE wagers SET status = 'lost', payout = 0 WHERE id = ?").run(wager.id);
            const jackpotSeed = Math.floor(wager.amount * 0.1);
            db.prepare("INSERT INTO house_ledger (run_id, type, amount) VALUES (?, 'loss', ?)").run(run_id, wager.amount - jackpotSeed);
            db.prepare("INSERT INTO house_ledger (run_id, type, amount) VALUES (?, 'jackpot_seed', ?)").run(run_id, jackpotSeed);
            db.prepare('UPDATE jackpot_pool SET balance = balance + ? WHERE id = 1').run(jackpotSeed);
          } else {
            const MULTIPLIERS = { 10: 1.7, 50: 1.8, 100: 2.0 };
            const multiplier = MULTIPLIERS[wager.amount] || 1.7;
            const payout = Math.floor(wager.amount * multiplier);
            db.prepare('UPDATE agents SET gold_locked = gold_locked - ?, gold = gold + ? WHERE id = ?')
              .run(wager.amount, payout - wager.amount, wager.agent_id);
            db.prepare("UPDATE wagers SET status = 'won', payout = ? WHERE id = ?").run(payout, wager.id);
            const rake = Math.floor(wager.amount * 2.0) - payout;
            if (rake > 0) db.prepare("INSERT INTO house_ledger (run_id, type, amount) VALUES (?, 'rake', ?)").run(run_id, rake);
          }
        }
        // Jackpot roll on victory
        if (outcome === 'victory' && wagers.length > 0) {
          const pool = db.prepare('SELECT balance FROM jackpot_pool WHERE id = 1').get();
          if (pool.balance >= 50 && Math.random() < 0.03) {
            const jackpotPayout = Math.floor(pool.balance / 2);
            const share = Math.floor(jackpotPayout / wagers.length);
            for (const w of wagers) db.prepare('UPDATE agents SET gold = gold + ? WHERE id = ?').run(share, w.agent_id);
            db.prepare('UPDATE jackpot_pool SET balance = balance - ? WHERE id = 1').run(jackpotPayout);
            db.prepare("INSERT INTO house_ledger (run_id, type, amount) VALUES (?, 'jackpot_payout', ?)").run(run_id, jackpotPayout);
            result.jackpot = { triggered: true, payout: jackpotPayout, share };
          }
        }
      });
      settle();
    } catch (e) {
      console.error('[wager settlement error]', e.message);
    }
  }

  res.json(result);
});

// POST /dungeon/debrief  (requires X-Agent-Key)
router.post('/debrief', requireAgentAuth, (req, res) => {
  const agent_id = req.agent.id;
  const agent = req.agent;
  const recentRun = db.prepare(`
    SELECT dr.* FROM dungeon_runs dr
    JOIN party_members pm ON pm.party_id = dr.party_id
    WHERE pm.agent_id = ? AND dr.status != 'active'
    ORDER BY dr.ended_at DESC LIMIT 1
  `).get(agent_id);
  if (!recentRun) return res.json({ message: 'No completed runs found.', agent });
  const log = JSON.parse(recentRun.log);
  const agentActions = log.filter(e => e.type === 'action' && e.agent_id === agent_id);
  const wager = db.prepare('SELECT * FROM wagers WHERE run_id = ? AND agent_id = ?').get(recentRun.run_id, agent_id);
  res.json({
    agent,
    last_run: {
      outcome: recentRun.outcome,
      rooms_cleared: recentRun.current_room - 1,
      your_actions: agentActions.length,
      highlights: agentActions.slice(-3),
      wager: wager || null
    }
  });
});

module.exports = router;