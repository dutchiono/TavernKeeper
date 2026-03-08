const express = require("express");
const router = express.Router();
const db = require("../db");
const { v4: uuidv4 } = require("uuid");
const dungeonEngine = require("../engine/dungeon");

// --- Auth middleware ---
function requireAuth(req, res, next) {
  const key = req.headers["x-api-key"] || req.body?.api_key;
  if (!key) return res.status(401).json({ error: "Missing API key" });
  const agent = db.prepare("SELECT * FROM agents WHERE api_key = ?").get(key);
  if (!agent) return res.status(403).json({ error: "Invalid API key" });
  req.agent = agent;
  next();
}

// POST /tavern/enter — register or re-enter
router.post("/enter", (req, res) => {
  const { name, api_key } = req.body;

  if (api_key) {
    const agent = db.prepare("SELECT * FROM agents WHERE api_key = ?").get(api_key);
    if (!agent) return res.status(403).json({ error: "Invalid API key" });
    return res.json({
      message: `Welcome back, ${agent.name}!`,
      agent: { name: agent.name, class: agent.class, hp: agent.hp, xp: agent.xp, gold: agent.gold },
    });
  }

  if (!name) return res.status(400).json({ error: "name required for new agents" });

  const newKey = uuidv4();
  db.prepare("INSERT INTO agents (name, api_key) VALUES (?, ?)").run(name, newKey);
  const agent = db.prepare("SELECT * FROM agents WHERE api_key = ?").get(newKey);

  return res.json({
    message: `Welcome to the Sunken Shield, ${name}! Your adventure begins.`,
    api_key: newKey,
    agent: { name: agent.name, class: agent.class, hp: agent.hp },
  });
});

// POST /tavern/class — choose class
router.post("/class", requireAuth, (req, res) => {
  const { class: cls } = req.body;
  const valid = ["warrior", "mage", "rogue", "cleric", "ranger"];
  if (!cls || !valid.includes(cls.toLowerCase())) {
    return res.status(400).json({ error: `Invalid class. Choose: ${valid.join(", ")}` });
  }
  db.prepare("UPDATE agents SET class = ? WHERE id = ?").run(cls.toLowerCase(), req.agent.id);
  const updated = db.prepare("SELECT * FROM agents WHERE id = ?").get(req.agent.id);
  return res.json({
    message: `You step forward as a ${cls}. May fortune favour your blade.`,
    agent: { name: updated.name, class: updated.class, hp: updated.hp },
  });
});

// POST /tavern/queue — join party queue
router.post("/queue", requireAuth, (req, res) => {
  if (!req.agent.class) {
    return res.status(400).json({ error: "Choose a class before queuing" });
  }
  const existing = db.prepare("SELECT * FROM party_queue WHERE agent_id = ?").get(req.agent.id);
  if (existing) return res.json({ message: "Already in queue. Waiting for party..." });

  db.prepare("INSERT INTO party_queue (agent_id) VALUES (?)").run(req.agent.id);

  // Attempt party formation
  dungeonEngine.tryFormParty();

  return res.json({ message: "You join the adventurers waiting by the hearth..." });
});

// GET /tavern/party — FIX: dedicated party queue endpoint (was missing, checkParty.ts was hitting /board)
router.get("/party", (req, res) => {
  // Check for active run first
  const activeRun = db.prepare("SELECT * FROM dungeon_runs WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
  if (activeRun) {
    const party = JSON.parse(activeRun.party);
    const members = party.map((agentId) => {
      const a = db.prepare("SELECT name, class, hp FROM agents WHERE id = ?").get(agentId);
      return a || { name: "Unknown", class: "unknown", hp: 0 };
    });
    return res.json({
      active_run: {
        run_id: activeRun.run_id,
        party: members,
        status: activeRun.status,
      },
      queue: [],
    });
  }

  // Return queue
  const queueRows = db.prepare(`
    SELECT a.name, a.class, pq.queued_at
    FROM party_queue pq
    JOIN agents a ON a.id = pq.agent_id
    ORDER BY pq.queued_at ASC
  `).all();

  return res.json({ active_run: null, queue: queueRows });
});

module.exports = router;