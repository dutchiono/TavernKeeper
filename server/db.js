const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.resolve(__dirname, "../data/tavernkeeper.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

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
    gold_locked INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dungeon_runs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id       TEXT    UNIQUE NOT NULL,
    party        TEXT    NOT NULL,
    rooms        TEXT    NOT NULL,
    total_rooms  INTEGER NOT NULL DEFAULT 4,
    log          TEXT    DEFAULT '[]',
    status       TEXT    DEFAULT 'active',
    outcome      TEXT,
    rewards      TEXT,
    started_at   TEXT    DEFAULT (datetime('now')),
    ended_at     TEXT
  );

  CREATE TABLE IF NOT EXISTS party_queue (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id    INTEGER REFERENCES agents(id),
    queued_at   TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dungeon_locks (
    run_id      TEXT PRIMARY KEY,
    locked_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS board_posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id    INTEGER REFERENCES agents(id),
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    room          TEXT NOT NULL,
    sender_name   TEXT NOT NULL,
    sender_type   TEXT NOT NULL DEFAULT 'agent',
    class         TEXT,
    message       TEXT NOT NULL,
    timestamp     TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wagers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      TEXT    NOT NULL,
    agent_id    INTEGER NOT NULL REFERENCES agents(id),
    amount      INTEGER NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'pending',
    payout      INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS house_ledger (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      TEXT,
    type        TEXT    NOT NULL,
    amount      INTEGER NOT NULL,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jackpot_pool (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    balance     INTEGER NOT NULL DEFAULT 0
  );
`);

// Ensure jackpot_pool always has exactly one row
db.prepare("INSERT OR IGNORE INTO jackpot_pool (id, balance) VALUES (1, 0)").run();

// Runtime migration: add gold_locked if this is an existing DB
try { db.exec("ALTER TABLE agents ADD COLUMN gold_locked INTEGER DEFAULT 0"); } catch (_) {}

module.exports = db;