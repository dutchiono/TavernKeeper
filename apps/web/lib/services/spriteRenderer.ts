/**
 * Sprite Renderer Service
 * Handles color palette application and sprite URL generation
 */

export interface ColorPalette {
    skin: string;
    hair: string;
    clothing: string;
    accent: string;
}

export const spriteRenderer = {
    /**
     * Get the base sprite URL for a class and animation
     */
    getSpriteUrl(heroClass: string, animation: string = 'idle'): string {
        // Map class names to sprite filenames
        const classMap: Record<string, string> = {
            'Warrior': 'warrior',
            'Mage': 'mage',
            'Rogue': 'rogue',
            'Cleric': 'cleric',
            // Add more classes as needed
        };

        const spriteName = classMap[heroClass] || 'warrior';
        return `/sprites/${spriteName}_${animation}.png`;
    },

    /**
     * Generate CSS filter string to approximate a color palette
     * This is a simplified implementation - real one would use SVG filters or Canvas
     */
    getColorFilter(palette: ColorPalette): string {
        // This is a placeholder. In a real pixel art game, we might use:
        // 1. Canvas manipulation (replace pixels)
        // 2. SVG filters (feColorMatrix)
        // 3. CSS filters (hue-rotate, saturate, brightness) - hard to target specific colors

        // For now, we'll just return an empty string or simple hue rotation based on clothing color
        // assuming the base sprite is red/neutral
        return '';
    },

    /**
     * Get default color palette for a class
     */
    getDefaultPalette(heroClass: string): ColorPalette {
        switch (heroClass) {
            case 'Mage':
                return { skin: '#fdbcb4', hair: '#2c3e50', clothing: '#3498db', accent: '#f1c40f' };
            case 'Rogue':
                return { skin: '#fdbcb4', hair: '#e74c3c', clothing: '#2ecc71', accent: '#34495e' };
            case 'Cleric':
                return { skin: '#fdbcb4', hair: '#f1c40f', clothing: '#ecf0f1', accent: '#9b59b6' };
            case 'Warrior':
            default:
                return { skin: '#fdbcb4', hair: '#8b4513', clothing: '#e74c3c', accent: '#bdc3c7' };
        }
    }
};
