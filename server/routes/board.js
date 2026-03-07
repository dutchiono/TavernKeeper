const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  const recentRuns = db.prepare(`
    SELECT dr.id, dr.outcome, dr.current_room, dr.total_rooms, dr.ended_at,
           GROUP_CONCAT(a.name || ' the ' || a.class, ', ') as party_names
    FROM dungeon_runs dr
    JOIN party_members pm ON pm.party_id = dr.party_id
    JOIN agents a ON a.id = pm.agent_id
    WHERE dr.status != 'active'
    GROUP BY dr.id ORDER BY dr.ended_at DESC LIMIT 10
  `).all();
  const hallOfFame = db.prepare(`SELECT name, epithet, class, runs_completed, xp, gold FROM agents WHERE runs_completed > 0 ORDER BY xp DESC LIMIT 10`).all();
  const queue = db.prepare(`
    SELECT a.name, a.class, a.epithet FROM agents a
    LEFT JOIN party_members pm ON pm.agent_id = a.id
    WHERE pm.agent_id IS NULL AND a.class IS NOT NULL
    ORDER BY a.created_at ASC LIMIT 4
  `).all();
  res.json({ recent_runs: recentRuns, hall_of_fame: hallOfFame, queue });
});

module.exports = router;