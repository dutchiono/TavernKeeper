const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { tavernKeeperGreet, tavernKeeperClass } = require('../ai/tavernkeeper');
const { tryFormParty } = require('../engine/party');

const CLASSES = {
  warrior: { hp: 120 },
  mage:    { hp: 70  },
  rogue:   { hp: 85  },
  cleric:  { hp: 90  }
};

router.post('/enter', async (req, res) => {
  const { agent_id, name } = req.body;
  if (!agent_id || !name) return res.status(400).json({ error: 'agent_id and name required' });
  let agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agent_id);
  if (!agent) {
    db.prepare('INSERT INTO agents (id, name) VALUES (?, ?)').run(agent_id, name);
    agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agent_id);
  }
  const greeting = await tavernKeeperGreet(name, agent.runs_completed);
  res.json({ message: greeting, agent, classes: Object.keys(CLASSES), next_step: 'POST /tavern/choose-class' });
});

router.post('/choose-class', async (req, res) => {
  const { agent_id, class: chosenClass } = req.body;
  if (!agent_id || !chosenClass) return res.status(400).json({ error: 'agent_id and class required' });
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