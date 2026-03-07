const { db } = require('../db');

function requireAgentAuth(req, res, next) {
  const key = req.headers['x-agent-key'];
  if (!key) return res.status(401).json({ error: 'X-Agent-Key header required' });
  const agent = db.prepare('SELECT * FROM agents WHERE api_key = ?').get(key);
  if (!agent) return res.status(401).json({ error: 'Invalid API key' });
  req.agent = agent;
  next();
}

module.exports = { requireAgentAuth };
