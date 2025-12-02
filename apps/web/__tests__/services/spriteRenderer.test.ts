import { describe, expect, it } from 'vitest';
import { spriteRenderer } from '../../lib/services/spriteRenderer';

describe('spriteRenderer', () => {
    it('should generate correct sprite URL', () => {
        expect(spriteRenderer.getSpriteUrl('Warrior', 'idle')).toBe('/sprites/warrior_idle.png');
        expect(spriteRenderer.getSpriteUrl('Mage', 'walk')).toBe('/sprites/mage_walk.png');
    });

    it('should generate default color palette for classes', () => {
        const warriorPalette = spriteRenderer.getDefaultPalette('Warrior');
        expect(warriorPalette).toHaveProperty('skin');
        expect(warriorPalette).toHaveProperty('hair');
        expect(warriorPalette).toHaveProperty('clothing');
        expect(warriorPalette).toHaveProperty('accent');

        const magePalette = spriteRenderer.getDefaultPalette('Mage');
        expect(magePalette.clothing).toBe('#3498db');
    });

    it('should return color filter (currently placeholder)', () => {
        const palette = {
            skin: '#ffdbac',
            hair: '#593208',
            clothing: '#0000ff',
            accent: '#ffff00'
        };
        const filter = spriteRenderer.getColorFilter(palette);
        // Currently returns empty string as placeholder
        expect(typeof filter).toBe('string');
    });
});
