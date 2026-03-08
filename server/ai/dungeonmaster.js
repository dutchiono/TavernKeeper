/**
 * server/ai/dungeonmaster.js
 * OpenAI-powered DM narration for dungeon events.
 */

const OpenAI = require('openai');
const path   = require('path');
const fs     = require('fs');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DM_PERSONA = fs.existsSync(path.join(__dirname, '../../prompts/dungeonmaster.md'))
  ? fs.readFileSync(path.join(__dirname, '../../prompts/dungeonmaster.md'), 'utf8')
  : `You are the TavernKeeper Dungeon Master. Narrate dungeon events in vivid, dark-fantasy prose.
Keep narrations to 2-3 sentences. Be dramatic but concise. Reference the hero's name and class.
Never break character. Use second-person for room entries, third-person for actions.`;

async function chat(messages, maxTokens = 180) {
  const res = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    max_tokens:  maxTokens,
    temperature: 0.85,
    messages,
  });
  return res.choices[0].message.content.trim();
}

async function narrateRoomEntry(runId, room, roomNum, totalRooms) {
  const isBoss    = room.is_boss;
  const enemyList = room.enemies.map(e => e.name).join(', ');
  const eventNote = room.event ? `This room also has a ${room.event} event waiting.` : '';

  return chat([
    { role: 'system', content: DM_PERSONA },
    {
      role: 'user',
      content: `Room ${roomNum} of ${totalRooms}. Description: "${room.desc}". Enemies present: ${enemyList}. ${isBoss ? 'THIS IS THE BOSS ROOM.' : ''} ${eventNote}
Narrate the party entering this room. 2-3 sentences, second-person plural ("You step into...").`,
    },
  ]);
}

async function narrateAction(runId, actor, action, flavorText, logEntry, room) {
  const dmgDealt    = Object.values(logEntry.damage_to_enemies || {}).reduce((a, b) => a + b, 0);
  const dmgReceived = Object.values(logEntry.damage_to_party   || {}).reduce((a, b) => a + b, 0);
  const healDone    = Object.values(logEntry.heals             || {}).reduce((a, b) => a + b, 0);
  const aliveCount  = room.enemies.filter(e => e.hp > 0).length;
  const eventNote   = logEntry.room_event ? `A ${logEntry.room_event} event triggered: ${JSON.stringify(logEntry.room_event_result)}.` : '';

  return chat([
    { role: 'system', content: DM_PERSONA },
    {
      role: 'user',
      content: `Hero: ${actor.name} the ${actor.class}. Action: ${action}. ${flavorText ? `Flavor: "${flavorText}".` : ''}
Damage dealt: ${dmgDealt}. Damage received: ${dmgReceived}. Healing done: ${healDone}.
Enemies still alive in room: ${aliveCount}. ${eventNote}
Narrate this action in 2 sentences, third-person.`,
    },
  ]);
}

async function narrateOutcome(runId, outcome, log) {
  const actions = log.filter(e => e.type === 'action').slice(-5);
  const summary = actions.map(a => `${a.agent_name} used ${a.action}`).join('; ');

  return chat([
    { role: 'system', content: DM_PERSONA },
    {
      role: 'user',
      content: `The dungeon run ended in ${outcome.toUpperCase()}. Final actions: ${summary}.
Write a 3-sentence closing narration. ${outcome === 'victory' ? 'Triumphant, epic tone.' : 'Somber, tragic tone.'}`,
    },
  ], 220);
}

module.exports = { narrateRoomEntry, narrateAction, narrateOutcome };