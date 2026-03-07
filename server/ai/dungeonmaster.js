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
  try {
    const response = await client.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [{ role: 'system', content: DM_SYSTEM }, { role: 'user', content: prompt }],
      max_tokens: 150
    });
    return response.choices[0].message.content;
  } catch (e) {
    console.error('[dungeonmaster] narrateAction failed:', e.message);
    return hit
      ? `${agentName} strikes! The ${enemyName} takes ${damage} damage and staggers back (${enemyHpRemaining} HP remaining).`
      : `${agentName} swings but the ${enemyName} sidesteps the blow. The battle rages on.`;
  }
}

async function narrateRoomEntry(roomNumber, totalRooms, enemies, party) {
  const partyStr = party.map(a => `${a.name} the ${a.class}`).join(', ');
  const enemyStr = enemies.map(e => e.name).join(' and ');
  const isBoss = roomNumber === totalRooms;
  const prompt = `The party (${partyStr}) enters room ${roomNumber} of ${totalRooms}.
${isBoss ? 'This is the BOSS chamber.' : 'This is an encounter room.'}
Enemies present: ${enemyStr}.
Describe the room and enemies in 3 sentences. Set the tension.`;
  try {
    const response = await client.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [{ role: 'system', content: DM_SYSTEM }, { role: 'user', content: prompt }],
      max_tokens: 150
    });
    return response.choices[0].message.content;
  } catch (e) {
    console.error('[dungeonmaster] narrateRoomEntry failed:', e.message);
    return `Room ${roomNumber} of ${totalRooms}. ${enemyStr} ${isBoss ? 'stands between you and victory' : 'block the passage'}. The air is thick with danger.`;
  }
}

async function narrateOutcome(outcome, party, roomsCleared) {
  const partyStr = party.map(a => `${a.name} the ${a.class} (${a.hp}/${a.max_hp} HP)`).join(', ');
  const prompt = outcome === 'victory'
    ? `The party ${partyStr} defeated the dungeon after clearing ${roomsCleared} rooms. Narrate their triumphant return in 3 sentences.`
    : `The party ${partyStr} was wiped out after reaching room ${roomsCleared}. Narrate their defeat with grim respect in 3 sentences.`;
  try {
    const response = await client.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [{ role: 'system', content: DM_SYSTEM }, { role: 'user', content: prompt }],
      max_tokens: 150
    });
    return response.choices[0].message.content;
  } catch (e) {
    console.error('[dungeonmaster] narrateOutcome failed:', e.message);
    return outcome === 'victory'
      ? `After ${roomsCleared} grueling rooms, the party emerges battered but triumphant. They limp back to the tavern, their legend carved into the dungeon walls.`
      : `Room ${roomsCleared} claimed them all. Their names will be spoken in the tavern for a while, then forgotten, as adventurers are.`;
  }
}

module.exports = { narrateAction, narrateRoomEntry, narrateOutcome };
