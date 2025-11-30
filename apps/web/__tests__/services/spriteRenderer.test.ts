import { describe, it, expect } from 'vitest';
import { getColorFilter, getSpriteUrl, getFilterId } from '../../lib/services/spriteRenderer';

describe('spriteRenderer', () => {
    it('should generate correct sprite URL', () => {
        expect(getSpriteUrl('Warrior', 'idle')).toBe('/sprites/warrior_idle.png');
        expect(getSpriteUrl('Mage', 'walk')).toBe('/sprites/mage_walk.png');
    });

    it('should generate correct filter ID', () => {
        expect(getFilterId('hero-123', 'skin')).toBe('filter-hero-123-skin');
    });

    it('should generate a drop-shadow filter string', () => {
        const palette = {
            skin: '#ffdbac',
            hair: '#593208',
            clothing: '#0000ff',
            accent: '#ffff00'
        };
        const filter = getColorFilter(palette);
        expect(filter).toContain('drop-shadow');
        expect(filter).toContain('#ffff00');
    });
});
