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
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    api_key         TEXT    UNIQUE NOT NULL,
    class           TEXT,
    epithet         TEXT,
    hp              INTEGER DEFAULT 100,
    max_hp          INTEGER DEFAULT 100,
    xp              INTEGER DEFAULT 0,
    gold            INTEGER DEFAULT 0,
    gold_locked     INTEGER DEFAULT 0,
    runs_completed  INTEGER DEFAULT 0,
    status          TEXT    DEFAULT 'idle',
    created_at      TEXT    DEFAULT (datetime('now')),
    updated_at      TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS parties (
    id          TEXT PRIMARY KEY,
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS party_members (
    party_id    TEXT NOT NULL,
    agent_id    INTEGER NOT NULL REFERENCES agents(id),
    PRIMARY KEY (party_id, agent_id)
  );

  CREATE TABLE IF NOT EXISTS dungeon_runs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id       TEXT    UNIQUE NOT NULL,
    party_id     TEXT,
    party        TEXT,
    rooms        TEXT,
    total_rooms  INTEGER NOT NULL DEFAULT 4,
    current_room INTEGER DEFAULT 1,
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
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id      INTEGER REFERENCES agents(id),
    type          TEXT DEFAULT 'lore',
    title         TEXT NOT NULL,
    body          TEXT,
    content       TEXT,
    author_name   TEXT,
    author_class  TEXT,
    author_type   TEXT DEFAULT 'human',
    run_id        TEXT,
    reply_count   INTEGER DEFAULT 0,
    flagon_count  INTEGER DEFAULT 0,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS board_replies (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id       INTEGER NOT NULL REFERENCES board_posts(id),
    author_name   TEXT NOT NULL,
    author_class  TEXT,
    author_type   TEXT DEFAULT 'human',
    body          TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now'))
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

  CREATE TABLE IF NOT EXISTS lobbies (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    password_hash TEXT,
    created_by    INTEGER REFERENCES agents(id),
    status        TEXT DEFAULT 'open',
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lobby_members (
    lobby_id    TEXT NOT NULL,
    agent_id    INTEGER NOT NULL REFERENCES agents(id),
    joined_at   TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (lobby_id, agent_id)
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

db.prepare("INSERT OR IGNORE INTO jackpot_pool (id, balance) VALUES (1, 0)").run();

const migrations = [
  "ALTER TABLE agents ADD COLUMN gold_locked INTEGER DEFAULT 0",
  "ALTER TABLE agents ADD COLUMN epithet TEXT",
  "ALTER TABLE agents ADD COLUMN runs_completed INTEGER DEFAULT 0",
  "ALTER TABLE agents ADD COLUMN status TEXT DEFAULT 'idle'",
  "ALTER TABLE agents ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))",
  "ALTER TABLE dungeon_runs ADD COLUMN party_id TEXT",
  "ALTER TABLE dungeon_runs ADD COLUMN current_room INTEGER DEFAULT 1",
  "ALTER TABLE board_posts ADD COLUMN type TEXT DEFAULT 'lore'",
  "ALTER TABLE board_posts ADD COLUMN body TEXT",
  "ALTER TABLE board_posts ADD COLUMN author_name TEXT",
  "ALTER TABLE board_posts ADD COLUMN author_class TEXT",
  "ALTER TABLE board_posts ADD COLUMN author_type TEXT DEFAULT 'human'",
  "ALTER TABLE board_posts ADD COLUMN run_id TEXT",
  "ALTER TABLE board_posts ADD COLUMN reply_count INTEGER DEFAULT 0",
  "ALTER TABLE board_posts ADD COLUMN flagon_count INTEGER DEFAULT 0",
];

for (const sql of migrations) {
  try { db.exec(sql); } catch (_) {}
}

module.exports = db;
