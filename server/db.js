const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const db = new Database(path.join(DATA_DIR, 'tavern.db'));

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
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
  `);
}

module.exports = { db, initDb };