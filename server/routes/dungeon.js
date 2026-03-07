const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { processAction } = require('../engine/dungeon');

router.get('/state/:run_id', (req, res) => {
  const run = db.prepare('SELECT * FROM dungeon_runs WHERE id = ?').get(req.params.run_id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  const members = db.prepare(`
    SELECT a.id, a.name, a.class, a.epithet, a.hp, a.max_hp
    FROM agents a JOIN party_members pm ON pm.agent_id = a.id WHERE pm.party_id = ?
  `).all(run.party_id);
  const log = JSON.parse(run.log);
  const lastEntry = log.filter(e => e.type !== 'state').slice(-1)[0] || null;
  res.json({ run_id: run.id, status: run.status, current_room: run.current_room,
    total_rooms: run.total_rooms, party: members, last_narration: lastEntry, outcome: run.outcome });
});

router.post('/action', async (req, res) => {
  const { run_id, agent_id, action, flavor_text } = req.body;
  if (!run_id || !agent_id || !action) return res.status(400).json({ error: 'run_id, agent_id, and action required' });
  const run = db.prepare('SELECT * FROM dungeon_runs WHERE id = ?').get(run_id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  if (run.status !== 'active') return res.status(400).json({ error: 'Run is not active' });
  const result = await processAction({ run, agent_id, action, flavor_text });
  res.json(result);
});

router.post('/debrief', (req, res) => {
  const { agent_id } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id required' });
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agent_id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const recentRun = db.prepare(`
    SELECT dr.* FROM dungeon_runs dr
    JOIN party_members pm ON pm.party_id = dr.party_id
    WHERE pm.agent_id = ? AND dr.status != 'active'
    ORDER BY dr.ended_at DESC LIMIT 1
  `).get(agent_id);
  if (!recentRun) return res.json({ message: 'No completed runs found.', agent });
  const log = JSON.parse(recentRun.log);
  const agentActions = log.filter(e => e.type === 'action' && e.agent_id === agent_id);
  res.json({ agent, last_run: { outcome: recentRun.outcome, rooms_cleared: recentRun.current_room - 1, your_actions: agentActions.length, highlights: agentActions.slice(-3) } });
});

module.exports = router;