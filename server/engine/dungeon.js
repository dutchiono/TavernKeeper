const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { narrateAction, narrateRoomEntry, narrateOutcome } = require('../ai/dungeonmaster');

const ENEMIES = [
  { name: 'Crypt Rat Swarm',   hp: 40,  attack: 8,  type: 'minion' },
  { name: 'Hollow Knight',     hp: 80,  attack: 18, type: 'elite'  },
  { name: 'Plague Priest',     hp: 60,  attack: 14, type: 'elite'  },
  { name: 'Bone Archer',       hp: 50,  attack: 12, type: 'minion' },
  { name: 'The Warden of Ash', hp: 150, attack: 22, type: 'boss'   },
  { name: 'Duskmother',        hp: 180, attack: 20, type: 'boss'   },
  { name: 'Shard Golem',       hp: 200, attack: 18, type: 'boss'   }
];

const CLASS_DMG = {
  warrior: { attack: [12,22], spell: [8,14],  skill: [15,25], heal: [0,0]   },
  mage:    { attack: [6,12],  spell: [20,35], skill: [18,30], heal: [0,0]   },
  rogue:   { attack: [14,24], spell: [8,14],  skill: [18,28], heal: [0,0]   },
  cleric:  { attack: [8,14],  spell: [12,20], skill: [10,18], heal: [20,35] }
};

const ROOM_DESC = [
  'A flooded antechamber reeking of rot. Moss-covered bones line the walls.',
  'A collapsed library. Shelves of blackened scrolls surround a broken altar.',
  'The inner sanctum. A throne of fused skulls sits at the far end. The air hums.'
];

function roll(n=20) { return Math.floor(Math.random()*n)+1; }
function rand(a,b)  { return Math.floor(Math.random()*(b-a+1))+a; }

function makeRoom(num, boss) {
  if (boss) {
    const b = ENEMIES.filter(e=>e.type==='boss');
    return { enemies: [{ ...b[Math.floor(Math.random()*b.length)] }], description: ROOM_DESC[2] };
  }
  const pool = ENEMIES.filter(e=>e.type!=='boss');
  const count = num===1 ? 2 : 3;
  return {
    enemies: Array.from({length:count}, ()=>({ ...pool[Math.floor(Math.random()*pool.length)] })),
    description: ROOM_DESC[num-1] || ROOM_DESC[0]
  };
}

async function startDungeonRun(partyId) {
  const runId = uuidv4();
  const rooms = [makeRoom(1,false), makeRoom(2,false), makeRoom(3,true)];
  const log = [{ type:'state', rooms }];
  db.prepare('INSERT INTO dungeon_runs (id, party_id, total_rooms, log, status) VALUES (?,?,?,?,?)')
    .run(runId, partyId, 3, JSON.stringify(log), 'active');
  const party = db.prepare('SELECT a.* FROM agents a JOIN party_members pm ON pm.agent_id=a.id WHERE pm.party_id=?').all(partyId);
  narrateRoomEntry(1, 3, rooms[0].enemies, party).then(narration => {
    const current = JSON.parse(db.prepare('SELECT log FROM dungeon_runs WHERE id=?').get(runId).log);
    current.push({ type:'room_entry', room:1, narration, enemies:rooms[0].enemies, timestamp:new Date().toISOString() });
    db.prepare('UPDATE dungeon_runs SET log=? WHERE id=?').run(JSON.stringify(current), runId);
  });
  return runId;
}

async function processAction({ run, agent_id, action, flavor_text }) {
  const log = JSON.parse(run.log);
  const stateEntry = log.find(e=>e.type==='state');
  if (!stateEntry) return { error: 'State missing' };
  const roomIdx = run.current_room - 1;
  const roomData = stateEntry.rooms[roomIdx];
  const alive = roomData.enemies.filter(e=>e.hp>0);
  if (!alive.length) return { message:'Room is clear. Advance.', room_clear:true };
  const agent = db.prepare('SELECT * FROM agents WHERE id=?').get(agent_id);
  if (!agent) return { error:'Agent not found' };
  const d20 = roll();
  const hit = d20 >= 8;
  const isCrit = d20 === 20;
  let damage = 0;
  const classDmg = CLASS_DMG[agent.class] || CLASS_DMG.warrior;
  if (action === 'heal' && agent.class === 'cleric') {
    const healAmount = rand(...classDmg.heal);
    const party = db.prepare('SELECT a.* FROM agents a JOIN party_members pm ON pm.agent_id=a.id WHERE pm.party_id=?').all(run.party_id);
    const wounded = party.filter(a=>a.hp<a.max_hp && a.id!==agent_id);
    if (wounded.length) {
      const t = wounded[0];
      db.prepare('UPDATE agents SET hp=? WHERE id=?').run(Math.min(t.max_hp, t.hp+healAmount), t.id);
    }
  } else if (hit) {
    const range = classDmg[action] || classDmg.attack;
    damage = rand(...range);
    if (isCrit) damage = Math.floor(damage*2);
    const target = alive[0];
    target.hp = Math.max(0, target.hp - damage);
    const ei = roomData.enemies.findIndex(e=>e.name===target.name);
    if (ei>=0) stateEntry.rooms[roomIdx].enemies[ei].hp = target.hp;
  }
  const enemyActions = [];
  const stillAlive = stateEntry.rooms[roomIdx].enemies.filter(e=>e.hp>0);
  for (const enemy of stillAlive) {
    if (roll() >= 9) {
      db.prepare('UPDATE agents SET hp=MAX(0,hp-?) WHERE id=?').run(enemy.attack, agent_id);
      enemyActions.push({ enemy:enemy.name, damage:enemy.attack, hit:true });
    } else {
      enemyActions.push({ enemy:enemy.name, damage:0, hit:false });
    }
  }
  const target = alive[0];
  const narration = await narrateAction({
    agentName:agent.name, agentClass:agent.class, action,
    roll:d20, hit, damage, enemyName:target.name,
    enemyHpRemaining:target.hp, roomDescription:roomData.description
  });
  log[log.findIndex(e=>e.type==='state')] = stateEntry;
  log.push({ type:'action', agent_id, agent_name:agent.name, action, flavor_text,
    roll:d20, hit, damage, narration, enemy_counter:enemyActions, timestamp:new Date().toISOString() });
  const remaining = stateEntry.rooms[roomIdx].enemies.filter(e=>e.hp>0);
  let roomCleared = false, dungeonComplete = false, outcome = null;
  if (!remaining.length) {
    roomCleared = true;
    if (run.current_room >= run.total_rooms) {
      dungeonComplete = true; outcome = 'victory';
    } else {
      const nextRoom = stateEntry.rooms[run.current_room];
      db.prepare('UPDATE dungeon_runs SET current_room=? WHERE id=?').run(run.current_room+1, run.id);
      const party = db.prepare('SELECT a.* FROM agents a JOIN party_members pm ON pm.agent_id=a.id WHERE pm.party_id=?').all(run.party_id);
      const rn = await narrateRoomEntry(run.current_room+1, run.total_rooms, nextRoom.enemies, party);
      log.push({ type:'room_entry', room:run.current_room+1, narration:rn, enemies:nextRoom.enemies });
    }
  }
  const party = db.prepare('SELECT a.hp FROM agents a JOIN party_members pm ON pm.agent_id=a.id WHERE pm.party_id=?').all(run.party_id);
  if (party.every(a=>a.hp<=0)) { dungeonComplete=true; outcome='tpk'; }
  if (dungeonComplete) {
    const fullParty = db.prepare('SELECT a.* FROM agents a JOIN party_members pm ON pm.agent_id=a.id WHERE pm.party_id=?').all(run.party_id);
    const outcomeNarration = await narrateOutcome(outcome, fullParty, run.current_room);
    log.push({ type:'outcome', outcome, narration:outcomeNarration });
    db.prepare('UPDATE dungeon_runs SET status=?,outcome=?,ended_at=CURRENT_TIMESTAMP,log=? WHERE id=?')
      .run('complete', outcome, JSON.stringify(log), run.id);
    const xp=outcome==='victory'?100:25, gold=outcome==='victory'?rand(20,80):rand(0,10);
    db.prepare('UPDATE agents SET xp=xp+?,gold=gold+?,runs_completed=runs_completed+1,hp=max_hp WHERE id IN (SELECT agent_id FROM party_members WHERE party_id=?)').run(xp, gold, run.party_id);
    return { narration, enemy_actions:enemyActions, roll:d20, hit, damage, dungeon_complete:true, outcome, outcome_narration:outcomeNarration, xp_earned:xp, gold_earned:gold };
  }
  db.prepare('UPDATE dungeon_runs SET log=? WHERE id=?').run(JSON.stringify(log), run.id);
  const refreshed = db.prepare('SELECT * FROM agents WHERE id=?').get(agent_id);
  return { narration, enemy_actions:enemyActions, roll:d20, hit, damage, room_cleared:roomCleared, your_hp:refreshed.hp, your_max_hp:refreshed.max_hp };
}

module.exports = { startDungeonRun, processAction };