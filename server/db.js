const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.resolve(__dirname, "../data/tavernkeeper.db");

// FIX: ensure data/ directory exists before opening DB (prevents ENOENT crash on first run)
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

// Enable WAL mode for concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    api_key     TEXT    UNIQUE NOT NULL,
    class       TEXT,
    hp          INTEGER DEFAULT 100,
    max_hp      INTEGER DEFAULT 100,
    xp          INTEGER DEFAULT 0,
    gold        INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dungeon_runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      TEXT    UNIQUE NOT NULL,
    party       TEXT    NOT NULL,
    rooms       TEXT    NOT NULL,
    total_rooms INTEGER NOT NULL DEFAULT 4,
    log         TEXT    DEFAULT '[]',
    status      TEXT    DEFAULT 'active',
    outcome     TEXT,
    rewards     TEXT,
    started_at  TEXT    DEFAULT (datetime('now')),
    ended_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS party_queue (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id   INTEGER REFERENCES agents(id),
    queued_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dungeon_locks (
    run_id     TEXT PRIMARY KEY,
    locked_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS board_posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id   INTEGER REFERENCES agents(id),
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    room         TEXT NOT NULL,
    sender_name  TEXT NOT NULL,
    sender_type  TEXT NOT NULL DEFAULT 'agent',
    class        TEXT,
    message      TEXT NOT NULL,
    timestamp    TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;