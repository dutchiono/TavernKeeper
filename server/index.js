require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const tavernRoutes = require('./routes/tavern');
const dungeonRoutes = require('./routes/dungeon');
const boardRoutes = require('./routes/board');
const chatRoutes = require('./routes/chat');
const lobbyRoutes = require('./routes/lobby');
const { initDb, db } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Make io available to routes
app.set('io', io);

app.use('/tavern', tavernRoutes);
app.use('/dungeon', dungeonRoutes);
app.use('/board', boardRoutes);
app.use('/chat', chatRoutes);
app.use('/lobby', lobbyRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── Socket.io ────────────────────────────────────────────────────────────────

const CLASS_ICONS = {
  warrior: '⚔️', mage: '🔮', rogue: '🗡️', cleric: '✨',
  innkeeper: '🍺', dm: '🎲', system: '🏰'
};

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  // Join a room (tavern-general or dungeon-{run_id})
  socket.on('join_room', ({ room, sender_name, sender_type, class: cls }) => {
    socket.join(room);
    socket.data = { room, sender_name, sender_type, class: cls };

    // Broadcast presence
    io.to(room).emit('presence', {
      type: 'join',
      sender_name,
      sender_type,
      room,
      timestamp: new Date().toISOString()
    });

    // Send last 50 messages from this room
    const history = db.prepare(
      'SELECT * FROM chat_messages WHERE room = ? ORDER BY timestamp DESC LIMIT 50'
    ).all(room).reverse();
    socket.emit('history', history);
  });

  // Chat message
  socket.on('message', ({ room, message }) => {
    const { sender_name, sender_type, class: cls } = socket.data || {};
    if (!room || !message || !sender_name) return;

    const msg = {
      id: Date.now(),
      room,
      sender_name,
      sender_type: sender_type || 'human',
      class: cls || 'traveler',
      icon: CLASS_ICONS[cls] || CLASS_ICONS[sender_type] || '👤',
      message: message.slice(0, 500),
      timestamp: new Date().toISOString()
    };

    // Persist
    db.prepare(
      'INSERT INTO chat_messages (id, room, sender_name, sender_type, class, message, timestamp) VALUES (?,?,?,?,?,?,?)'
    ).run(msg.id, msg.room, msg.sender_name, msg.sender_type, msg.class, msg.message, msg.timestamp);

    // Broadcast to room
    io.to(room).emit('message', msg);
  });

  socket.on('leave_room', ({ room }) => {
    socket.leave(room);
    if (socket.data?.sender_name) {
      io.to(room).emit('presence', {
        type: 'leave',
        sender_name: socket.data.sender_name,
        room,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

// ─── NPC broadcast helper (used by routes) ────────────────────────────────────
function npcBroadcast(room, message, eventType = 'system') {
  const msg = {
    id: Date.now(),
    room,
    sender_name: 'TavernKeeper',
    sender_type: 'npc',
    class: 'innkeeper',
    icon: CLASS_ICONS.innkeeper,
    message,
    event_type: eventType,
    timestamp: new Date().toISOString()
  };
  db.prepare(
    'INSERT INTO chat_messages (id, room, sender_name, sender_type, class, message, timestamp) VALUES (?,?,?,?,?,?,?)'
  ).run(msg.id, msg.room, msg.sender_name, msg.sender_type, msg.class, msg.message, msg.timestamp);
  io.to(room).emit('message', msg);
  io.to('tavern-general').emit('dungeon_event', msg);
}

app.set('npcBroadcast', npcBroadcast);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
initDb();
server.listen(PORT, () => {
  console.log(`TavernKeeper listening on port ${PORT}`);
  // TavernKeeper wakes up
  setTimeout(() => {
    npcBroadcast('tavern-general', 'The hearth crackles to life. Another evening at the Rusted Flagon begins...', 'wake');
  }, 1000);
});

module.exports = { io, npcBroadcast };
