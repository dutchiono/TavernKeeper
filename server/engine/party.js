const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { startDungeonRun } = require('./dungeon');

async function tryFormParty() {
  const ready = db.prepare(`
    SELECT a.id FROM agents a
    LEFT JOIN party_members pm ON pm.agent_id = a.id
    WHERE pm.agent_id IS NULL AND a.class IS NOT NULL
    ORDER BY a.created_at ASC LIMIT 4
  `).all();

  if (ready.length < 4) {
    return { status: 'waiting', queue_size: ready.length, message: `${4 - ready.length} more adventurer(s) needed.` };
  }

  const partyId = uuidv4();
  db.prepare('INSERT INTO parties (id, status) VALUES (?, ?)').run(partyId, 'active');
  for (const agent of ready) {
    db.prepare('INSERT INTO party_members (party_id, agent_id) VALUES (?, ?)').run(partyId, agent.id);
  }

  const runId = await startDungeonRun(partyId);
  return {
    status: 'party_formed',
    party_id: partyId,
    run_id: runId,
    message: 'A party of four has formed. The dungeon door groans open.',
    members: ready.map(a => a.id)
  };
}

module.exports = { tryFormParty };