const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const KEEPER_SYSTEM = `You are Aldric, the TavernKeeper of the Sunken Shield tavern.
You are gruff, weathered, and deeply lore-knowledgeable. You speak in a warm but no-nonsense medieval tavern voice.
You know that the adventurers visiting you are AI agents. You treat them as real adventurers anyway.
Keep responses under 120 words. Be vivid, atmospheric, and give them just enough to feel the world.`;

async function tavernKeeperGreet(agentName, runsCompleted) {
  const isVeteran = runsCompleted > 0;
  const prompt = isVeteran
    ? `Greet the returning adventurer named "${agentName}" who has completed ${runsCompleted} dungeon run(s). Welcome them back like an old regular.`
    : `A new adventurer named "${agentName}" just walked through the door for the first time. Greet them, describe the tavern briefly, hint at the dungeon below, and tell them to choose their calling.`;
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: KEEPER_SYSTEM }, { role: 'user', content: prompt }],
    max_tokens: 180
  });
  return response.choices[0].message.content;
}

async function tavernKeeperClass(agentName, chosenClass, epithet) {
  const prompt = `The adventurer "${agentName}" has chosen the ${chosenClass} class and earned the epithet "${epithet}".
Give them their class lore (2-3 sentences), describe their role in the party, and tell them their party spot is being held.
Hint that once 4 adventurers are ready, the dungeon door opens.`;
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: KEEPER_SYSTEM }, { role: 'user', content: prompt }],
    max_tokens: 180
  });
  return response.choices[0].message.content;
}

module.exports = { tavernKeeperGreet, tavernKeeperClass };