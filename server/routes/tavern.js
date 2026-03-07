const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { tavernKeeperGreet, tavernKeeperClass } = require('../ai/tavernkeeper');
const { tryFormParty } = require('../engine/party');
const { requireAgentAuth } = require('../middleware/auth');

const CLASSES = {
  warrior: { hp: 120 },
  mage:    { hp: 70  },
  rogue:   { hp: 85  },
  cleric:  { hp: 90  }
};

// POST /tavern/enter
// New agent: { name } -> creates agent, returns api_key (shown once)
// Returning agent: { api_key } -> re-enters, returns agent info (no key repeat)
router.post('/enter', async (req, res) => {
  const { name, api_key } = req.body;

  // Returning agent login
  if (api_key) {
    const agent = db.prepare('SELECT * FROM agents WHERE api_key = ?').get(api_key);
    if (!agent) return res.status(401).json({ error: 'Invalid API key' });
    const greeting = await tavernKeeperGreet(agent.name, agent.runs_completed);
    return res.json({
      message: greeting,
      agent,
      classes: Object.keys(CLASSES),
      next_step: agent.class ? 'POST /dungeon/action or GET /dungeon/state/:run_id' : 'POST /tavern/choose-class'
    });
  }

  // New agent registration
  if (!name) return res.status(400).json({ error: 'name required (or api_key for returning agents)' });
  const agent_id = uuidv4();
  const new_api_key = uuidv4();
  db.prepare('INSERT INTO agents (id, name, api_key) VALUES (?, ?, ?)').run(agent_id, name, new_api_key);
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agent_id);
  const greeting = await tavernKeeperGreet(name, 0);
  res.json({
    message: greeting,
    agent,
    api_key: new_api_key,
    api_key_notice: 'Save this key - it will not be shown again. Send it as X-Agent-Key header on future requests.',
    classes: Object.keys(CLASSES),
    next_step: 'POST /tavern/choose-class'
  });
});

// POST /tavern/choose-class  (requires X-Agent-Key)
router.post('/choose-class', requireAgentAuth, async (req, res) => {
  const { class: chosenClass } = req.body;
  const agent_id = req.agent.id;
  if (!chosenClass) return res.status(400).json({ error: 'class required' });
  if (!CLASSES[chosenClass.toLowerCase()]) return res.status(400).json({ error: 'Unknown class. Choose: warrior, mage, rogue, cleric' });

  const cls = CLASSES[chosenClass.toLowerCase()];
  const epithets = ['the Unyielding','of the Hollow Road','Ashborn','the Pale','Ironjaw','the Unbroken','Duskwalker','the Forgotten','of the Black Candle','Gravewhisper'];
  const epithet = epithets[Math.floor(Math.random() * epithets.length)];

  db.prepare('UPDATE agents SET class = ?, epithet = ?, hp = ?, max_hp = ? WHERE id = ?')
    .run(chosenClass.toLowerCase(), epithet, cls.hp, cls.hp, agent_id);

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agent_id);
  const lore = await tavernKeeperClass(agent.name, chosenClass, epithet);
  const partyResult = await tryFormParty();

  res.json({ message: lore, agent, party_status: partyResult });
});

// GET /tavern/party-status  (public)
router.get('/party-status', (req, res) => {
  const queue = db.prepare(`
    SELECT a.id, a.name, a.class, a.epithet FROM agents a
    LEFT JOIN party_members pm ON pm.agent_id = a.id
    WHERE pm.agent_id IS NULL AND a.class IS NOT NULL
    ORDER BY a.created_at ASC LIMIT 4
  `).all();
  const activeRuns = db.prepare(`SELECT id FROM dungeon_runs WHERE status = 'active'`).all();
  res.json({ queue_size: queue.length, queue, spots_remaining: 4 - queue.length, active_runs: activeRuns.length });
});

module.exports = router;
