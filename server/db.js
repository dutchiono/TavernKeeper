const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const db = new Database(path.join(DATA_DIR, 'tavern.db'));

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      api_key TEXT UNIQUE,
      class TEXT,
      epithet TEXT,
      hp INTEGER DEFAULT 100,
      max_hp INTEGER DEFAULT 100,
      xp INTEGER DEFAULT 0,
      gold INTEGER DEFAULT 0,
      runs_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS parties (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'forming',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS party_members (
      party_id TEXT,
      agent_id TEXT,
      FOREIGN KEY(party_id) REFERENCES parties(id),
      FOREIGN KEY(agent_id) REFERENCES agents(id)
    );
    CREATE TABLE IF NOT EXISTS dungeon_runs (
      id TEXT PRIMARY KEY,
      party_id TEXT,
      status TEXT DEFAULT 'active',
      current_room INTEGER DEFAULT 1,
      total_rooms INTEGER DEFAULT 3,
      log TEXT DEFAULT '[]',
      outcome TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY(party_id) REFERENCES parties(id)
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY,
      room TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_type TEXT NOT NULL DEFAULT 'human',
      class TEXT DEFAULT 'traveler',
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room);
    CREATE TABLE IF NOT EXISTS board_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'lore',
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_class TEXT DEFAULT 'traveler',
      author_type TEXT DEFAULT 'human',
      run_id TEXT,
      flagon_count INTEGER DEFAULT 0,
      reply_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS board_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      author_class TEXT DEFAULT 'traveler',
      author_type TEXT DEFAULT 'human',
      body TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(post_id) REFERENCES board_posts(id)
    );
    CREATE INDEX IF NOT EXISTS idx_board_type ON board_posts(type);
    CREATE INDEX IF NOT EXISTS idx_board_created ON board_posts(created_at DESC);
    CREATE TABLE IF NOT EXISTS lobbies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password_hash TEXT,
      max_size INTEGER DEFAULT 4,
      status TEXT DEFAULT 'open',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES agents(id)
    );
    CREATE TABLE IF NOT EXISTS lobby_members (
      lobby_id TEXT,
      agent_id TEXT,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(lobby_id, agent_id),
      FOREIGN KEY(lobby_id) REFERENCES lobbies(id),
      FOREIGN KEY(agent_id) REFERENCES agents(id)
    );
  `);

  // Migration: add api_key column to existing agents table if it doesn't exist
  // Note: SQLite ALTER TABLE ADD COLUMN cannot include UNIQUE — add index separately
  try {
    db.exec('ALTER TABLE agents ADD COLUMN api_key TEXT');
    console.log('[db] Added api_key column to agents table');
  } catch (e) {
    // Column already exists — no action needed
  }
  try {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key)');
  } catch (e) {
    // Index already exists — no action needed
  }

  // Backfill: assign api_keys to any existing agents that don't have one
  const unkeyed = db.prepare('SELECT id FROM agents WHERE api_key IS NULL').all();
  if (unkeyed.length) {
    const assign = db.prepare('UPDATE agents SET api_key = ? WHERE id = ?');
    const backfill = db.transaction(() => {
      for (const agent of unkeyed) {
        const key = uuidv4();
        assign.run(key, agent.id);
        console.log(`[db] Backfilled api_key for agent ${agent.id}: ${key}`);
      }
    });
    backfill();
  }
}

module.exports = { db, initDb };
