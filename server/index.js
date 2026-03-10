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
const dungeonEngine = require('./engine/dungeon');
const db = require('./db');

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
app.use('/wager', require('./routes/wager'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ┌── Socket.io ──────────────────────────────────────────────────────────────────

const CLASS_ICONS = {
  warrior: 'W', mage: 'M', rogue: 'R', cleric: 'C',
  innkeeper: 'I', dm: 'D', system: 'S'
};

// ── Turn-lock helper (mirrors the REST route lock logic) ──────────────────────
const LOCK_TTL_MS = 5000;

function acquireSocketLock(run_id) {
  const now = Date.now();
  const existing = db.prepare('SELECT locked_at FROM dungeon_locks WHERE run_id = ?').get(run_id);
  if (existing) {
    const age = now - new Date(existing.locked_at).getTime();
    if (age < LOCK_TTL_MS) return false; // locked by another action
    db.prepare('DELETE FROM dungeon_locks WHERE run_id = ?').run(run_id);
  }
  db.prepare('INSERT OR REPLACE INTO dungeon_locks (run_id, locked_at) VALUES (?, ?)')
    .run(run_id, new Date().toISOString());
  return true;
}

function releaseSocketLock(run_id) {
  db.prepare('DELETE FROM dungeon_locks WHERE run_id = ?').run(run_id);
}

// ─────────────────────────────────────────────────────────────────────────────

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
      icon: CLASS_ICONS[cls] || CLASS_ICONS[sender_type] || '?',
      message: message.slice(0, 500),
      timestamp: new Date().toISOString()
    };

    // Persist
    db.prepare(
      'INSERT INTO chat_messages (id, room, sender_name, sender_type, class, message, timestamp) VALUES (?,?,?,?,?,?,?)'
    ).run(msg.id, msg.room, msg.sender_name, msg.sender_type, msg.class, msg.message, msg.timestamp);

    // Broadcast to room
    io.to(msg.room).emit('message', msg);
  });

  // ── dungeon_action via WebSocket — FIX: apply turn lock before processing ──
  socket.on('dungeon_action', async ({ run_id, action, target, api_key }) => {
    if (!run_id || !api_key) {
      socket.emit('dungeon_error', { error: 'run_id and api_key required' });
      return;
    }

    // Auth check
    const agent = db.prepare('SELECT * FROM agents WHERE api_key = ?').get(api_key);
    if (!agent) {
      socket.emit('dungeon_error', { error: 'Invalid API key' });
      return;
    }

    // Dead agent gate
    if (agent.hp <= 0) {
      socket.emit('dungeon_error', { error: 'Your hero has fallen. You may only observe.' });
      return;
    }

    // Turn lock — same 5-second TTL as the REST route
    const locked = acquireSocketLock(run_id);
    if (!locked) {
      socket.emit('dungeon_error', { error: 'Another action is already in progress. Wait your turn.' });
      return;
    }

    try {
      const result = await dungeonEngine.processAction({
        run_id,
        actor_id: agent.id,
        action: action || 'attack',
        target: target || ''
      });

      // Broadcast result to the dungeon room so all party members see it
      io.to(`dungeon-${run_id}`).emit('dungeon_result', result);

      // If run complete, notify tavern-general too
      if (result.run_complete) {
        io.to('tavern-general').emit('run_complete', {
          run_id,
          outcome: result.outcome,
          message: `A dungeon run has ended: ${result.outcome}`
        });
      }
    } catch (err) {
      console.error('[socket] dungeon_action error:', err);
      socket.emit('dungeon_error', { error: 'Internal server error during action' });
    } finally {
      releaseSocketLock(run_id);
    }
  });

  socket.on('disconnect', () => {
    if (socket.data?.room) {
      io.to(socket.data.room).emit('presence', {
        type: 'leave',
        sender_name: socket.data.sender_name,
        sender_type: socket.data.sender_type,
        room: socket.data.room,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// ┌── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`TavernKeeper running on :${PORT}`);
});