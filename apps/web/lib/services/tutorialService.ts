'use server';

import OpenAI from 'openai';
import { GameView } from '../types';
import { getContextualDocs, searchDocs } from './docSearchService';

const getAI = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set in environment variables.");
    }
    return new OpenAI({ apiKey });
};

/**
 * Get contextual help based on current view/page
 */
export async function getContextualHelp(view: GameView | string, question?: string): Promise<string> {
    try {
        const client = getAI();

        // Get relevant docs for this view
        const relevantDocs = await getContextualDocs(view);
        const docsContext = relevantDocs
            .map((doc: { title: string; content: string }) => `# ${doc.title}\n\n${doc.content}`)
            .join('\n\n---\n\n');

        const systemPrompt = `You are a helpful guide for TavernKeeper, a dungeon crawler game on the Monad blockchain.
You have access to the game's documentation. Use it to provide accurate, helpful answers.

Current Context: User is viewing the ${view} page.

Documentation:
${docsContext || 'No specific documentation found for this view.'}

Instructions:
- Answer questions using the documentation provided
- If the documentation doesn't cover the question, say so honestly
- Keep responses concise (2-3 sentences max)
- Be friendly and helpful
- Use game terminology correctly`;

        const userMessage = question || `What should I know about the ${view} page?`;

        const response = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            max_tokens: 200,
            temperature: 0.7,
        });

        return response.choices[0]?.message?.content || "I'm not sure how to help with that. Check the documentation for more details.";
    } catch (error) {
        console.error('Error getting contextual help:', error);
        return "Sorry, I couldn't load the help information. Please check the documentation.";
    }
}

/**
 * Search docs and get AI-powered answer
 */
export async function searchAndAnswer(question: string): Promise<string> {
    try {
        const client = getAI();

        // Search for relevant docs
        const relevantDocs = await searchDocs(question);
        const docsContext = relevantDocs
            .map((doc: { title: string; content: string }) => `# ${doc.title}\n\n${doc.content}`)
            .join('\n\n---\n\n');

        const systemPrompt = `You are a helpful guide for TavernKeeper. Answer questions using the provided documentation.

Documentation:
${docsContext || 'No relevant documentation found.'}

Instructions:
- Answer based on the documentation
- If documentation doesn't cover it, say so
- Keep responses concise (2-4 sentences)
- Be accurate and helpful`;

        const response = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: question }
            ],
            max_tokens: 300,
            temperature: 0.7,
        });

        return response.choices[0]?.message?.content || "I couldn't find information about that. Try checking the documentation.";
    } catch (error) {
        console.error('Error searching and answering:', error);
        return "Sorry, I couldn't process that question. Please try again.";
    }
}

/**
 * Get a tutorial/guide for first-time users on a specific view
 */
export async function getTutorialForView(view: GameView | string): Promise<string> {
    try {
        const client = getAI();

        const relevantDocs = await getContextualDocs(view);
        const docsContext = relevantDocs
            .map((doc: { title: string; content: string }) => `# ${doc.title}\n\n${doc.content}`)
            .join('\n\n---\n\n');

        const systemPrompt = `You are creating a brief tutorial for new players visiting the ${view} page for the first time.

Documentation:
${docsContext || 'No specific documentation found.'}

Create a friendly, step-by-step tutorial (3-5 steps) explaining:
1. What this page/view is for
2. Key actions they can take
3. Important information to know

Keep it concise, friendly, and actionable. Format as a simple numbered list.`;

        const response = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Create a tutorial for the ${view} page` }
            ],
            max_tokens: 400,
            temperature: 0.8,
        });

        return response.choices[0]?.message?.content || `Welcome to the ${view} page! Explore the options available here.`;
    } catch (error) {
        console.error('Error generating tutorial:', error);
        return `Welcome to the ${view} page! Check the documentation for more details.`;
    }
}
