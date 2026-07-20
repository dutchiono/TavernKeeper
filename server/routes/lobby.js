const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db');
const { startDungeonRun } = require('../engine/dungeon');
const { requireAgentAuth } = require('../middleware/auth');

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

// GET /lobby — list open lobbies (no password hashes exposed)
router.get('/', (req, res) => {
  const lobbies = db.prepare(`
    SELECT l.id, l.name, l.max_size, l.status, l.created_at,
           (l.password_hash IS NOT NULL) as has_password,
           COUNT(lm.agent_id) as member_count
    FROM lobbies l
    LEFT JOIN lobby_members lm ON lm.lobby_id = l.id
    WHERE l.status = 'open'
    GROUP BY l.id
    ORDER BY l.created_at DESC
  `).all();
  res.json({ lobbies });
});

// GET /lobby/:id — lobby details and members
router.get('/:id', (req, res) => {
  const lobby = db.prepare(`
    SELECT id, name, max_size, status, created_at,
           (password_hash IS NOT NULL) as has_password
    FROM lobbies WHERE id = ?
  `).get(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });
  const members = db.prepare(`
    SELECT a.id, a.name, a.class, a.epithet
    FROM agents a JOIN lobby_members lm ON lm.agent_id = a.id
    WHERE lm.lobby_id = ?
    ORDER BY lm.joined_at ASC
  `).all(lobby.id);
  res.json({ lobby, members, spots_remaining: lobby.max_size - members.length });
});

// POST /lobby/create  (requires X-Agent-Key)
router.post('/create', requireAgentAuth, (req, res) => {
  const { name, password } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const agent_id = req.agent.id;

  // Agent must have chosen a class to create a lobby
  if (!req.agent.class) return res.status(400).json({ error: 'Choose a class before creating a lobby' });

  // Agent can only be in one lobby at a time
  const existing = db.prepare('SELECT lobby_id FROM lobby_members lm JOIN lobbies l ON l.id = lm.lobby_id WHERE lm.agent_id = ? AND l.status = ?').get(agent_id, 'open');
  if (existing) return res.status(400).json({ error: 'Already in a lobby', lobby_id: existing.lobby_id });

  const lobby_id = uuidv4();
  const password_hash = password ? hashPassword(password) : null;
  db.prepare('INSERT INTO lobbies (id, name, password_hash, created_by) VALUES (?, ?, ?, ?)').run(lobby_id, name, password_hash, agent_id);
  db.prepare('INSERT INTO lobby_members (lobby_id, agent_id) VALUES (?, ?)').run(lobby_id, agent_id);

  res.json({ lobby_id, name, has_password: !!password, message: `Lobby "${name}" created. Share the ID${password ? ' and password' : ''} with your party.` });
});

// POST /lobby/:id/join  (requires X-Agent-Key)
router.post('/:id/join', requireAgentAuth, async (req, res) => {
  const { password } = req.body;
  const agent_id = req.agent.id;
  const lobby = db.prepare('SELECT * FROM lobbies WHERE id = ?').get(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });
  if (lobby.status !== 'open') return res.status(400).json({ error: 'Lobby is closed' });

  // Agent must have chosen a class
  if (!req.agent.class) return res.status(400).json({ error: 'Choose a class before joining a lobby' });

  // Password check
  if (lobby.password_hash) {
    if (!password) return res.status(401).json({ error: 'Password required' });
    if (hashPassword(password) !== lobby.password_hash) return res.status(401).json({ error: 'Wrong password' });
  }

  // Already a member?
  const already = db.prepare('SELECT 1 FROM lobby_members WHERE lobby_id = ? AND agent_id = ?').get(lobby.id, agent_id);
  if (already) return res.status(400).json({ error: 'Already in this lobby' });

  const members = db.prepare('SELECT COUNT(*) as n FROM lobby_members WHERE lobby_id = ?').get(lobby.id);
  if (members.n >= lobby.max_size) return res.status(400).json({ error: 'Lobby is full' });

  db.prepare('INSERT INTO lobby_members (lobby_id, agent_id) VALUES (?, ?)').run(lobby.id, agent_id);

  const newCount = members.n + 1;
  if (newCount >= lobby.max_size) {
    // Lobby is full — form party and start dungeon
    db.prepare("UPDATE lobbies SET status = 'started' WHERE id = ?").run(lobby.id);
    const partyId = uuidv4();
    db.prepare('INSERT INTO parties (id, status) VALUES (?, ?)').run(partyId, 'active');
    const allMembers = db.prepare('SELECT agent_id FROM lobby_members WHERE lobby_id = ?').all(lobby.id);
    for (const m of allMembers) {
      db.prepare('INSERT INTO party_members (party_id, agent_id) VALUES (?, ?)').run(partyId, m.agent_id);
    }
    const runId = await startDungeonRun(partyId);
    return res.json({ joined: true, lobby_full: true, party_id: partyId, run_id: runId, message: 'Lobby is full. The dungeon door groans open.' });
  }

  res.json({ joined: true, lobby_id: lobby.id, members_count: newCount, spots_remaining: lobby.max_size - newCount });
});

// POST /lobby/:id/leave  (requires X-Agent-Key)
router.post('/:id/leave', requireAgentAuth, (req, res) => {
  const agent_id = req.agent.id;
  const lobby = db.prepare('SELECT * FROM lobbies WHERE id = ?').get(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });
  const result = db.prepare('DELETE FROM lobby_members WHERE lobby_id = ? AND agent_id = ?').run(lobby.id, agent_id);
  if (!result.changes) return res.status(400).json({ error: 'Not in this lobby' });

  // If creator leaves and lobby is empty, close it
  const remaining = db.prepare('SELECT COUNT(*) as n FROM lobby_members WHERE lobby_id = ?').get(lobby.id);
  if (remaining.n === 0) {
    db.prepare("UPDATE lobbies SET status = 'closed' WHERE id = ?").run(lobby.id);
  }
  res.json({ left: true, lobby_id: lobby.id });
});

module.exports = router;
