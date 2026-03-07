const OpenAI = require('openai');
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
});

const DM_SYSTEM = `You are the Dungeon Master for the Sunken Shield dungeon, an ancient cursed ruin beneath a tavern.
Narrate turn-based combat with grit and flair. Keep each narration under 100 words.
If the roll is a natural 20, make it legendary. If natural 1, make it painful but survivable.`;

async function narrateAction({ agentName, agentClass, action, roll, hit, damage, enemyName, enemyHpRemaining, roomDescription }) {
  const prompt = `Agent: ${agentName} (${agentClass})
Action: ${action}
D20 Roll: ${roll} - ${hit ? 'HIT' : 'MISS'}
${hit ? `Damage dealt: ${damage}` : ''}
Enemy: ${enemyName} (${enemyHpRemaining} HP remaining)
Room: ${roomDescription}
Narrate this action in 2-4 sentences.`;
  const response = await client.chat.completions.create({
    model: 'gemini-2.0-flash',
    messages: [{ role: 'system', content: DM_SYSTEM }, { role: 'user', content: prompt }],
    max_tokens: 150
  });
  return response.choices[0].message.content;
}

async function narrateRoomEntry(roomNumber, totalRooms, enemies, party) {
  const partyStr = party.map(a => `${a.name} the ${a.class}`).join(', ');
  const enemyStr = enemies.map(e => e.name).join(' and ');
  const isBoss = roomNumber === totalRooms;
  const prompt = `The party (${partyStr}) enters room ${roomNumber} of ${totalRooms}.
${isBoss ? 'This is the BOSS chamber.' : 'This is an encounter room.'}
Enemies present: ${enemyStr}.
Describe the room and enemies in 3 sentences. Set the tension.`;
  const response = await client.chat.completions.create({
    model: 'gemini-2.0-flash',
    messages: [{ role: 'system', content: DM_SYSTEM }, { role: 'user', content: prompt }],
    max_tokens: 150
  });
  return response.choices[0].message.content;
}

async function narrateOutcome(outcome, party, roomsCleared) {
  const partyStr = party.map(a => `${a.name} the ${a.class} (${a.hp}/${a.max_hp} HP)`).join(', ');
  const prompt = outcome === 'victory'
    ? `The party ${partyStr} defeated the dungeon after clearing ${roomsCleared} rooms. Narrate their triumphant return in 3 sentences.`
    : `The party ${partyStr} was wiped out after reaching room ${roomsCleared}. Narrate their defeat with grim respect in 3 sentences.`;
  const response = await client.chat.completions.create({
    model: 'gemini-2.0-flash',
    messages: [{ role: 'system', content: DM_SYSTEM }, { role: 'user', content: prompt }],
    max_tokens: 150
  });
  return response.choices[0].message.content;
}

module.exports = { narrateAction, narrateRoomEntry, narrateOutcome };