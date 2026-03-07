const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /chat/history/:room?limit=50
router.get('/history/:room', (req, res) => {
  const { room } = req.params;
  const limit = Math.min(parseInt(req.query.limit || 50), 200);
  const messages = db.prepare(
    'SELECT * FROM chat_messages WHERE room = ? ORDER BY timestamp DESC LIMIT ?'
  ).all(room, limit).reverse();
  res.json({ room, messages });
});

// GET /chat/rooms — list active rooms with last message
router.get('/rooms', (req, res) => {
  const rooms = db.prepare(`
    SELECT room, COUNT(*) as message_count, MAX(timestamp) as last_activity
    FROM chat_messages GROUP BY room ORDER BY last_activity DESC
  `).all();
  res.json({ rooms });
});

module.exports = router;
