/**
 * server/engine/dungeon.js
 * Dungeon engine — all 8 TLC fixes:
 *  1. Enemy HP persistence via log replay (getCurrentRoomState)
 *  2. Stale party HP fix — per-hit DB reads, dead-hero skip
 *  3. Action locking / turn serialization (dungeon_locks table)
 *  4. Dead agent gate
 *  5. Flexible party sizes (min 2, 2-min timeout)
 *  6. Room variety (12 descs, 20% events: treasure/trap/shrine/ambush)
 *  7. AI narration via server/ai/dungeonmaster.js
 *  8. XP + gold awards on completion
 */

const db = require('../db');
const { narrateAction, narrateRoomEntry, narrateOutcome } = require('../ai/dungeonmaster');

const MIN_PARTY_SIZE    = 2;
const MAX_PARTY_SIZE    = 4;
const PARTY_WAIT_MS     = 2 * 60 * 1000;
const LOCK_TTL_MS       = 5000;
const ROOM_EVENT_CHANCE = 0.20;

const ROOM_DESC = [
  'A damp corridor lit by sputtering torches. The air reeks of rot.',
  'A collapsed throne room. Bones of former kings crunch underfoot.',
  'A flooded chamber where something large breathes beneath the surface.',
  'A maze of crumbling pillars, shadows moving between each one.',
  'A forge-room, still hot. The bellows move on their own.',
  'A library of forbidden tomes, pages fluttering with no wind.',
  'A vast cistern, echoing with distant screams from below.',
  'A ritual chamber. A pentagram scorched into the stone still glows.',
  'A gallery of stone faces — all screaming. Eyes that track movement.',
  'A garden of petrified trees draped in cobwebs the size of nets.',
  'A hall of mirrors, each reflection showing something slightly wrong.',
  'A pit room. The floor is largely missing. Narrow ledges ring the edge.',
];

const ENEMIES = {
  normal: [
    { name: 'Skeletal Archer',  hp: 30,  max_hp: 30,  atk: [6,  12] },
    { name: 'Rot Hound',        hp: 25,  max_hp: 25,  atk: [8,  14] },
    { name: 'Crypt Crawler',    hp: 35,  max_hp: 35,  atk: [5,  10] },
    { name: 'Hollow Knight',    hp: 45,  max_hp: 45,  atk: [10, 18] },
    { name: 'Shade Wraith',     hp: 20,  max_hp: 20,  atk: [12, 20] },
  ],
  boss: [
    { name: 'The Bone Tyrant',          hp: 120, max_hp: 120, atk: [18, 30] },
    { name: 'Malgrath the Unburied',    hp: 150, max_hp: 150, atk: [15, 28] },
    { name: 'Vreth, Devourer of Halls', hp: 100, max_hp: 100, atk: [22, 35] },
  ],
};

const CLASS_DMG = {
  warrior: { attack: [12, 22], heal: [0,  0]  },
  mage:    { attack: [15, 28], heal: [8,  12] },
  rogue:   { attack: [10, 24], heal: [0,  0]  },
  cleric:  { attack: [6,  12], heal: [18, 30] },
};

const VALID_ACTIONS = {
  warrior: ['attack', 'defend'],
  mage:    ['attack', 'heal'],
  rogue:   ['attack'],
  cleric:  ['attack', 'heal'],
};

const LOOT_POOL = [
  'Shard of the Bone Tyrant', 'Ember Flask', 'Tarnished Hero Medal',
  'Wraithbound Tome', 'Cryptshard Dagger', 'Forgotten Crown',
  'Relic of the Deep Forge', 'Vial of Black Ichor',
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function makeRoom(roomNum, totalRooms) {
  const isBoss  = roomNum === totalRooms;
  const pool    = isBoss ? ENEMIES.boss : ENEMIES.normal;
  const count   = isBoss ? 1 : rand(1, 3);
  const enemies = Array.from({ length: count }, () => ({
    ...deepClone(pick(pool)),
    id: `enemy_${roomNum}_${Math.random().toString(36).slice(2, 7)}`,
  }));

  let event = null;
  if (!isBoss && Math.random() < ROOM_EVENT_CHANCE) {
    event = pick(['treasure', 'trap', 'shrine', 'ambush']);
  }

  return {
    room:           roomNum,
    desc:           ROOM_DESC[rand(0, ROOM_DESC.length - 1)],
    enemies,
    cleared:        false,
    is_boss:        isBoss,
    event,
    event_resolved: false,
  };
}

/**
 * FIX 1 — getCurrentRoomState
 * Rebuilds live enemy HP by replaying all damage events from the log.
 * The log is the single source of truth for combat state.
 */
function getCurrentRoomState(log, currentRoomNum) {
  const stateEntry = log.find(e => e.type === 'state');
  if (!stateEntry) return null;

  const rooms = deepClone(stateEntry.rooms);
  const room  = rooms.find(r => r.room === currentRoomNum);
  if (!room) return null;

  for (const entry of log) {
    if (entry.type !== 'action' || entry.room !== currentRoomNum) continue;
    if (entry.damage_to_enemies) {
      for (const [enemyId, dmg] of Object.entries(entry.damage_to_enemies)) {
        const enemy = room.enemies.find(e => e.id === enemyId);
        if (enemy) enemy.hp = Math.max(0, enemy.hp - dmg);
      }
    }
    if (entry.ambush_enemy) {
      room.enemies.push(entry.ambush_enemy);
    }
  }

  room.cleared = room.enemies.every(e => e.hp <= 0);
  return room;
}

/**
 * FIX 5 — tryFormParty
 * Flexible sizing: form at MAX_PARTY_SIZE immediately,
 * or after PARTY_WAIT_MS with at least MIN_PARTY_SIZE.
 */
async function tryFormParty() {
  const waiting = db.prepare(
    `SELECT * FROM agents WHERE status = 'waiting' ORDER BY updated_at ASC LIMIT ?`
  ).all(MAX_PARTY_SIZE);

  if (waiting.length < MIN_PARTY_SIZE) return null;

  const oldestWaitMs = Date.now() - new Date(waiting[0].updated_at).getTime();
  const shouldStart  = waiting.length >= MAX_PARTY_SIZE || oldestWaitMs >= PARTY_WAIT_MS;
  if (!shouldStart) return null;

  const party   = waiting.slice(0, MAX_PARTY_SIZE);
  const partyId = `party_${Date.now()}`;

  db.prepare(`INSERT INTO parties (id, status, created_at) VALUES (?, 'active', datetime('now'))`).run(partyId);
  const ins = db.prepare(`INSERT INTO party_members (party_id, agent_id) VALUES (?, ?)`);
  for (const agent of party) {
    ins.run(partyId, agent.id);
    db.prepare(`UPDATE agents SET status = 'in_party' WHERE id = ?`).run(agent.id);
  }

  return partyId;
}

async function startDungeonRun(partyId) {
  const totalRooms = rand(4, 6);
  const rooms      = Array.from({ length: totalRooms }, (_, i) => makeRoom(i + 1, totalRooms));
  const runId      = `run_${Date.now()}`;
  const initialLog = [{ type: 'state', rooms, timestamp: new Date().toISOString() }];

  db.prepare(
    `INSERT INTO dungeon_runs (id, party_id, status, current_room, total_rooms, log, created_at)
     VALUES (?, ?, 'active', 1, ?, ?, datetime('now'))`
  ).run(runId, partyId, totalRooms, JSON.stringify(initialLog));

  // FIX 8 (partial) — await room narration before returning so first GET has content
  try {
    const narration = await narrateRoomEntry(runId, rooms[0], 1, totalRooms);
    const run = db.prepare('SELECT * FROM dungeon_runs WHERE id = ?').get(runId);
    const log = JSON.parse(run.log);
    log.push({ type: 'room_entry', room: 1, narration, timestamp: new Date().toISOString() });
    db.prepare('UPDATE dungeon_runs SET log = ? WHERE id = ?').run(JSON.stringify(log), runId);
  } catch (err) {
    console.error('[dungeon] narrateRoomEntry failed:', err.message);
  }

  return runId;
}

/**
 * processAction — main entry point.
 * Applies FIX 4 (dead gate), FIX 3 (lock), then delegates to _inner.
 */
async function processAction(runId, agentId, action, flavorText) {
  // FIX 4 — dead agent gate
  const actor = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  if (!actor) return { error: 'Agent not found', code: 404 };
  if (actor.hp <= 0) return { error: 'Your hero has fallen. You may only observe.', code: 403 };

  // class-action validation
  const heroClass = actor.class || 'warrior';
  const allowed   = VALID_ACTIONS[heroClass] || ['attack'];
  if (!allowed.includes(action)) {
    return { error: `A ${heroClass} cannot perform '${action}'.`, code: 400 };
  }

  // FIX 3 — action lock
  const lockCutoff = new Date(Date.now() - LOCK_TTL_MS).toISOString();
  const existing   = db.prepare(
    `SELECT 1 FROM dungeon_locks WHERE run_id = ? AND locked_at > ?`
  ).get(runId, lockCutoff);
  if (existing) {
    return { error: 'Another action is being processed. Try again in a moment.', code: 409 };
  }
  db.prepare(`INSERT OR REPLACE INTO dungeon_locks (run_id, locked_at) VALUES (?, datetime('now'))`).run(runId);

  try {
    return await _processActionInner(runId, actor, heroClass, action, flavorText);
  } finally {
    db.prepare('DELETE FROM dungeon_locks WHERE run_id = ?').run(runId);
  }
}

async function _processActionInner(runId, actor, heroClass, action, flavorText) {
  const run = db.prepare('SELECT * FROM dungeon_runs WHERE id = ?').get(runId);
  if (!run)                    return { error: 'Run not found', code: 404 };
  if (run.status !== 'active') return { error: `Run is ${run.status}`, code: 400 };

  const log         = JSON.parse(run.log);
  const currentRoom = getCurrentRoomState(log, run.current_room);
  if (!currentRoom) return { error: 'Room state corrupted', code: 500 };

  const aliveEnemies = currentRoom.enemies.filter(e => e.hp > 0);
  const dmgRange     = CLASS_DMG[heroClass] || CLASS_DMG.warrior;

  const logEntry = {
    type:              'action',
    room:              run.current_room,
    agent_id:          actor.id,
    agent_name:        actor.name,
    agent_class:       heroClass,
    action,
    flavor_text:       flavorText || null,
    damage_to_enemies: {},
    damage_to_party:   {},
    heals:             {},
    timestamp:         new Date().toISOString(),
  };

  // FIX 6 — room event on first action in room
  const isFirstAction = !log.some(e => e.type === 'action' && e.room === run.current_room);
  if (isFirstAction && currentRoom.event && !currentRoom.event_resolved) {
    const evResult = resolveRoomEvent(currentRoom, run);
    logEntry.room_event        = currentRoom.event;
    logEntry.room_event_result = evResult;
    applyEventEffects(evResult, logEntry);
  }

  if (action === 'attack') {
    if (aliveEnemies.length === 0) {
      return { error: 'No enemies to attack — room already cleared.', code: 400 };
    }
    const target = pick(aliveEnemies);
    const dmg    = rand(...dmgRange.attack);
    logEntry.damage_to_enemies[target.id] = dmg;

    // Enemy counterattack — FIX 2: re-query hero HP before each hit
    const afterKill  = { ...target, hp: Math.max(0, target.hp - dmg) };
    const retaliators = currentRoom.enemies
      .map(e => e.id === target.id ? afterKill : e)
      .filter(e => e.hp > 0);

    for (const enemy of retaliators) {
      const fresh = db.prepare('SELECT hp FROM agents WHERE id = ?').get(actor.id);
      if (!fresh || fresh.hp <= 0) break; // FIX 2 — stop hitting dead heroes
      const eDmg    = rand(...enemy.atk);
      const newHp   = Math.max(0, fresh.hp - eDmg);
      logEntry.damage_to_party[actor.id] = (logEntry.damage_to_party[actor.id] || 0) + eDmg;
      db.prepare('UPDATE agents SET hp = ? WHERE id = ?').run(newHp, actor.id);
    }

  } else if (action === 'heal') {
    if (dmgRange.heal[1] === 0) return { error: `${heroClass} cannot heal.`, code: 400 };
    const target = db.prepare(
      `SELECT a.id, a.hp, a.max_hp FROM agents a
       JOIN party_members pm ON pm.agent_id = a.id
       WHERE pm.party_id = ? AND a.hp > 0 ORDER BY a.hp ASC LIMIT 1`
    ).get(run.party_id);
    if (target) {
      const healAmt = rand(...dmgRange.heal);
      db.prepare('UPDATE agents SET hp = MIN(hp + ?, max_hp) WHERE id = ?').run(healAmt, target.id);
      logEntry.heals[target.id] = healAmt;
    }

  } else if (action === 'defend') {
    logEntry.defend_buff = actor.id;
  }

  // Narrate
  let narration = `${actor.name} ${action === 'heal' ? 'channels healing energy' : action === 'defend' ? 'raises their guard' : 'strikes at the enemy'}.`;
  try {
    narration = await narrateAction(runId, actor, action, flavorText, logEntry, currentRoom);
  } catch (err) {
    console.error('[dungeon] narrateAction failed:', err.message);
  }
  logEntry.narration = narration;
  log.push(logEntry);

  // FIX 1 — derive cleared status from full log replay
  const freshRoom = getCurrentRoomState(log, run.current_room);
  const roomCleared = freshRoom && freshRoom.enemies.every(e => e.hp <= 0);

  // Check party wipe
  const survivors = db.prepare(
    `SELECT a.id FROM agents a JOIN party_members pm ON pm.agent_id = a.id
     WHERE pm.party_id = ? AND a.hp > 0`
  ).all(run.party_id);

  let runOutcome = null;
  if (survivors.length === 0) {
    runOutcome = 'defeat';
  } else if (roomCleared && run.current_room >= run.total_rooms) {
    runOutcome = 'victory';
  }

  let nextRoom = run.current_room;

  if (runOutcome) {
    let outcomeNarration = `The party ${runOutcome === 'victory' ? 'triumphed' : 'was defeated'}.`;
    try { outcomeNarration = await narrateOutcome(runId, runOutcome, log); } catch (_) {}
    log.push({ type: 'outcome', outcome: runOutcome, narration: outcomeNarration, timestamp: new Date().toISOString() });
    db.prepare(`UPDATE dungeon_runs SET status = 'completed', outcome = ?, log = ? WHERE id = ?`)
      .run(runOutcome, JSON.stringify(log), runId);
    if (runOutcome === 'victory') await awardRunRewards(run);

  } else if (roomCleared) {
    nextRoom = run.current_room + 1;
    try {
      const stateEntry  = log.find(e => e.type === 'state');
      const nextRoomData = stateEntry ? stateEntry.rooms.find(r => r.room === nextRoom) : null;
      if (nextRoomData) {
        const rNarration = await narrateRoomEntry(runId, nextRoomData, nextRoom, run.total_rooms);
        log.push({ type: 'room_entry', room: nextRoom, narration: rNarration, timestamp: new Date().toISOString() });
      }
    } catch (err) { console.error('[dungeon] narrateRoomEntry failed:', err.message); }
    db.prepare('UPDATE dungeon_runs SET current_room = ?, log = ? WHERE id = ?')
      .run(nextRoom, JSON.stringify(log), runId);

  } else {
    db.prepare('UPDATE dungeon_runs SET log = ? WHERE id = ?').run(JSON.stringify(log), runId);
  }

  return { ok: true, narration, room: nextRoom, room_cleared: roomCleared, run_outcome: runOutcome, log_entry: logEntry };
}

function resolveRoomEvent(room, run) {
  switch (room.event) {
    case 'treasure': return { type: 'treasure', heal_all: 20 };
    case 'trap': {
      const alive  = db.prepare(
        `SELECT a.id, a.name FROM agents a JOIN party_members pm ON pm.agent_id = a.id
         WHERE pm.party_id = ? AND a.hp > 0`
      ).all(run.party_id);
      const victim = pick(alive);
      return { type: 'trap', victim_id: victim?.id, victim_name: victim?.name, damage: 10 };
    }
    case 'shrine': {
      const lowest = db.prepare(
        `SELECT a.id, a.name, a.hp, a.max_hp FROM agents a JOIN party_members pm ON pm.agent_id = a.id
         WHERE pm.party_id = ? AND a.hp > 0 ORDER BY a.hp ASC LIMIT 1`
      ).get(run.party_id);
      return { type: 'shrine', target_id: lowest?.id, target_name: lowest?.name, heal: 20 };
    }
    case 'ambush': {
      const extra = { ...deepClone(pick(ENEMIES.normal)), id: `ambush_${Math.random().toString(36).slice(2, 7)}` };
      return { type: 'ambush', extra_enemy: extra };
    }
    default: return null;
  }
}

function applyEventEffects(evResult, logEntry) {
  if (!evResult) return;
  if (evResult.type === 'trap' && evResult.victim_id) {
    const hero = db.prepare('SELECT hp FROM agents WHERE id = ?').get(evResult.victim_id);
    if (hero) {
      db.prepare('UPDATE agents SET hp = MAX(0, hp - ?) WHERE id = ?').run(evResult.damage, evResult.victim_id);
      logEntry.damage_to_party[evResult.victim_id] = (logEntry.damage_to_party[evResult.victim_id] || 0) + evResult.damage;
    }
  } else if (evResult.type === 'shrine' && evResult.target_id) {
    db.prepare('UPDATE agents SET hp = MIN(hp + ?, max_hp) WHERE id = ?').run(evResult.heal, evResult.target_id);
    logEntry.heals[evResult.target_id] = evResult.heal;
  } else if (evResult.type === 'ambush' && evResult.extra_enemy) {
    logEntry.ambush_enemy = evResult.extra_enemy;
  } else if (evResult.type === 'treasure') {
    logEntry.event_heal_all = evResult.heal_all;
  }
}

// FIX 8 — award XP + gold on victory
async function awardRunRewards(run) {
  const xpGain = run.total_rooms * 50 + 150; // boss always killed on victory
  const heroes  = db.prepare(
    `SELECT a.id, a.xp, a.gold FROM agents a JOIN party_members pm ON pm.agent_id = a.id WHERE pm.party_id = ?`
  ).all(run.party_id);

  const rewards = {};
  for (const hero of heroes) {
    const goldGain = rand(20, 80);
    const loot     = Math.random() < 0.25 ? pick(LOOT_POOL) : null;
    db.prepare('UPDATE agents SET xp = xp + ?, gold = gold + ? WHERE id = ?').run(xpGain, goldGain, hero.id);
    rewards[hero.id] = { xp: xpGain, gold: goldGain, loot };
  }
  db.prepare('UPDATE dungeon_runs SET rewards = ? WHERE id = ?').run(JSON.stringify(rewards), run.id);
}

module.exports = { tryFormParty, startDungeonRun, processAction, getCurrentRoomState, makeRoom };