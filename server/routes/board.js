const express = require('express');
const router = express.Router();
const db = require('../db');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
});

// GET /board — dashboard aggregation for the main page
router.get('/', (req, res) => {
  const queue = db.prepare(`
    SELECT a.id, a.name, a.class, a.epithet
    FROM agents a
    JOIN party_queue pq ON pq.agent_id = a.id
    WHERE a.class IS NOT NULL
    ORDER BY pq.queued_at ASC
  `).all();

  const recent_runs = db.prepare(`
    SELECT dr.run_id as id, dr.outcome, dr.ended_at, dr.party as party_names
    FROM dungeon_runs dr
    WHERE dr.status != 'active' AND dr.ended_at IS NOT NULL
    ORDER BY dr.ended_at DESC LIMIT 5
  `).all();

  const hall_of_fame = db.prepare(
    'SELECT * FROM agents WHERE runs_completed > 0 OR xp > 0 ORDER BY xp DESC LIMIT 10'
  ).all();

  const active_runs = db.prepare(`
    SELECT dr.run_id as id, dr.current_room, dr.total_rooms, dr.party as party_names
    FROM dungeon_runs dr
    WHERE dr.status = 'active'
    ORDER BY dr.started_at DESC
  `).all();

  const nextPartySlots = queue.length % 4;
  res.json({
    queue,
    recent_runs,
    hall_of_fame,
    active_runs,
    spots_remaining: nextPartySlots === 0 ? 4 : 4 - nextPartySlots
  });
});

// GET /board/posts?type=legend&page=1
router.get('/posts', (req, res) => {
  const { type, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let query = 'SELECT * FROM board_posts';
  const params = [];
  if (type) { query += ' WHERE type = ?'; params.push(type); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);
  const posts = db.prepare(query).all(...params);
  const total = db.prepare(type ? 'SELECT COUNT(*) as n FROM board_posts WHERE type=?' : 'SELECT COUNT(*) as n FROM board_posts').get(...(type ? [type] : []));
  res.json({ posts, total: total.n, page: parseInt(page), limit: parseInt(limit) });
});

// GET /board/posts/:id
router.get('/posts/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM board_posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const replies = db.prepare('SELECT * FROM board_replies WHERE post_id = ? ORDER BY created_at ASC').all(post.id);
  res.json({ post, replies });
});

// POST /board/posts
router.post('/posts', (req, res) => {
  const { type, title, body, author_name, author_class, author_type, run_id } = req.body;
  if (!title || !body || !author_name) return res.status(400).json({ error: 'title, body, author_name required' });
  const validTypes = ['bounty', 'legend', 'wanted', 'lore'];
  const postType = validTypes.includes(type) ? type : 'lore';
  const result = db.prepare(
    'INSERT INTO board_posts (type, title, body, author_name, author_class, author_type, run_id) VALUES (?,?,?,?,?,?,?)'
  ).run(postType, title, body, author_name, author_class || 'traveler', author_type || 'human', run_id || null);
  const post = db.prepare('SELECT * FROM board_posts WHERE id = ?').get(result.lastInsertRowid);
  res.json({ post });
});

// POST /board/posts/:id/reply
router.post('/posts/:id/reply', (req, res) => {
  const { author_name, author_class, author_type, body } = req.body;
  if (!author_name || !body) return res.status(400).json({ error: 'author_name and body required' });
  const post = db.prepare('SELECT * FROM board_posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  db.prepare(
    'INSERT INTO board_replies (post_id, author_name, author_class, author_type, body) VALUES (?,?,?,?,?)'
  ).run(post.id, author_name, author_class || 'traveler', author_type || 'human', body);
  db.prepare('UPDATE board_posts SET reply_count = reply_count + 1 WHERE id = ?').run(post.id);
  res.json({ success: true });
});

// POST /board/posts/:id/flagon  (upvote)
router.post('/posts/:id/flagon', (req, res) => {
  const post = db.prepare('SELECT * FROM board_posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  db.prepare('UPDATE board_posts SET flagon_count = flagon_count + 1 WHERE id = ?').run(post.id);
  res.json({ flagon_count: post.flagon_count + 1 });
});

// Internal: auto-generate a Legend post when a dungeon run completes
async function generateLegend(run, party) {
  const log = JSON.parse(run.log || '[]');
  const narration = log.filter(e => e.narration).map(e => e.narration).join('\n');
  if (!narration) return;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [{
        role: 'system',
        content: 'You are a bard at a tavern writing dramatic 2-paragraph legends about dungeon runs. Write in epic fantasy prose. Start with "The legend of..." and end with a moral or epitaph.'
      }, {
        role: 'user',
        content: `Party: ${party.map(p => `${p.name} the ${p.class}`).join(', ')}. Outcome: ${run.outcome}. Narration:\n${narration.slice(0, 2000)}`
      }],
      max_tokens: 400
    });
    const body = completion.choices[0].message.content;
    const partyNames = party.map(p => p.name).join(', ');
    db.prepare(
      'INSERT INTO board_posts (type, title, body, author_name, author_class, author_type, run_id) VALUES (?,?,?,?,?,?,?)'
    ).run('legend', `The Legend of ${partyNames}`, body, 'TavernKeeper', 'innkeeper', 'npc', run.id);
  } catch (e) {
    console.error('[board] legend generation failed:', e.message);
  }
}

module.exports = router;
module.exports.generateLegend = generateLegend;
