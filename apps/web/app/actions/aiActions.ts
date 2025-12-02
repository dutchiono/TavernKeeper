'use server';

import OpenAI from 'openai';
import { Agent } from '../../lib/types';

const getAI = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set in environment variables.");
    }

    return new OpenAI({
        apiKey: apiKey,
    });
};

export const chatWithAgent = async (agent: Agent, userMessage: string): Promise<string> => {
    try {
        const client = getAI();

        const systemPrompt = `
      You are roleplaying as ${agent.name}, a level ${agent.level} ${agent.class} in a pixel-art fantasy RPG.
      Your traits are: ${agent.traits.join(', ')}.
      Your backstory: ${agent.backstory}.
      Current Status: Resting at the inn.
      
      Respond to the traveler (user) in character. 
      Keep your response short (under 40 words) to fit in a text box.
      Be flavorful, use archaic but readable fantasy speech if it fits your class.
      Do not break character.
    `;

        const response = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini', // Configurable model, defaults to fast/cheap
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            max_tokens: 100,
        });

        return response.choices[0]?.message?.content || "...";
    } catch (error) {
        console.error("Agent failed to respond:", error);
        return "*grunts unintelligibly* (The spirits are silent...)";
    }
};

export const generateAgentThought = async (agent: Agent, context?: { location?: string; activity?: string; nearbyAgents?: string[] }): Promise<string> => {
    try {
        const client = getAI();
        const contextStr = context ? `Context: Location: ${context.location}, Activity: ${context.activity}, Nearby: ${context.nearbyAgents?.join(', ')}` : '';

        const response = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Character: ${agent.name}, Class: ${agent.class}, Traits: ${agent.traits.join(', ')}. Generate a short, 1-sentence idle thought (max 10 words) for this RPG character.`
                },
                { role: 'user', content: contextStr || "Generate a thought." }
            ],
            temperature: 1.2, // High variety
            max_tokens: 50,
        });
        return response.choices[0]?.message?.content || "Hmm...";
    } catch (e) {
        console.error("Failed to generate thought:", e);
        return "Hmm...";
    }
}
