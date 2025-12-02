import { GoogleGenAI } from "@google/genai";
import { HeroClass, Gender, HeroColors } from '../types';

export const checkApiKey = async (): Promise<boolean> => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        return await (window as any).aistudio.hasSelectedApiKey();
    }
    return false;
};

export const promptForApiKey = async (): Promise<void> => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
    }
};

const getClient = async (): Promise<GoogleGenAI | null> => {
    // In a real scenario with the aistudio object, the key is injected into process.env.API_KEY
    // AFTER the user selects it. However, to be safe with the specific window object pattern:
    if (await checkApiKey()) {
        // We re-instantiate to ensure we pick up the injected key or use the environment
        return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    }
    return null;
};

export const generateHeroSprite = async (
    heroClass: HeroClass, 
    colors: HeroColors, 
    name: string
): Promise<string | null> => {
    const ai = await getClient();
    if (!ai) throw new Error("API Key not found");

    const prompt = `
        Generate a high-quality, professional pixel art spritesheet for a video game character.
        
        Character Description:
        - Class: ${heroClass}
        - Name: ${name}
        - Style: 16-bit SNES RPG style (like Final Fantasy 6 or Chrono Trigger).
        - Colors: Skin is ${colors.skin}, Hair is ${colors.hair}, Main Clothing is ${colors.clothing}, Accents are ${colors.accent}.
        
        Requirements:
        - View: Front-facing idle pose.
        - Format: Pixel art, clean lines, no anti-aliasing (sharp pixels).
        - Background: Pure white (#FFFFFF) background.
        - Resolution: High fidelity, detailed character.
        - content: A single character standing in an idle heroic pose.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
        });

        // Extract image
        // The prompt implies we want to handle the image output.
        // gemini-2.5-flash-image returns the image in the response structure.
        
        // We need to find the image part
        const candidates = response.candidates;
        if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
};

export const generateKeeperSprite = async (
    gender: Gender, 
    colors: HeroColors, 
    name: string
): Promise<string | null> => {
    const ai = await getClient();
    if (!ai) throw new Error("API Key not found");

    const prompt = `
        Generate a high-quality, professional pixel art character sprite for a Tavern Keeper NPC.
        
        Character Description:
        - Role: Innkeeper / Bartender.
        - Gender: ${gender}.
        - Name: ${name}
        - Style: High-bit Stardew Valley or Owlboy aesthetic. Detailed and chunky.
        - Colors: Skin ${colors.skin}, Hair ${colors.hair}, Apron/Clothing ${colors.clothing}.
        - Action: Cleaning a mug or holding a tankard.
        
        Requirements:
        - View: Front-facing.
        - Format: Pixel art, clean lines, sharp edges.
        - Background: Pure white (#FFFFFF) background.
        - Resolution: The character should be large and detailed.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
        });

        const candidates = response.candidates;
        if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
};