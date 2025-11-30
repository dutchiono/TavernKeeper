import { HeroMetadata } from './heroMinting';

export type HeroClass = 'Warrior' | 'Mage' | 'Rogue' | 'Cleric';

export interface HeroColors {
    skin: string;
    hair: string;
    clothing: string;
    accent: string;
}

// Palette mapping for our ASCII art
// . = Transparent
// X = Outline (Black/Dark)
// S = Skin
// H = Hair
// C = Clothing (Primary)
// A = Accent
// W = Weapon/Item (Silver/Wood/Gold usually fixed or accent)

const SPRITE_SIZE = 16; // 16x16 grid

// ASCII Maps for each class
// Frame A is standing tall. Frame B is "breathing" (usually 1px lower or compressed)

const WARRIOR_FRAMES = {
    A: [
        "................",
        ".....XXXXXX.....",
        "....XHAAAAHX....",
        "....XHSSSSHX....",
        "....XHSSSSHX....",
        "...XXAAAAAAXX...",
        "..XCCAAAAAACCX..",
        ".XACCCCAAAACCAX.",
        ".XACCCCAAACCCAX.",
        ".XACCCCAAACCCAX.",
        "..XCCCCXXCCCCX..",
        "...XXXX..XXXX...",
        "...XAAX..XAAX...",
        "...XAAX..XAAX...",
        "...XXXX..XXXX...",
        "................"
    ],
    B: [
        "................",
        "................", // Shifted down 1
        ".....XXXXXX.....",
        "....XHAAAAHX....",
        "....XHSSSSHX....",
        "....XHSSSSHX....",
        "...XXAAAAAAXX...",
        "..XCCAAAAAACCX..",
        ".XACCCCAAAACCAX.",
        ".XACCCCAAACCCAX.",
        "..XCCCCXXCCCCX..",
        "...XXXX..XXXX...",
        "...XAAX..XAAX...",
        "...XAAX..XAAX...",
        "...XXXX..XXXX...",
        "................"
    ]
};

const MAGE_FRAMES = {
    A: [
        "................",
        "......XXXX......",
        ".....XCCCCX.....",
        "....XCCCCCCX....",
        "....XCHHHHCX....",
        "....XCHSSHCX....",
        "....XCHSSHCX....",
        "...XXCCCCCCXX...",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "...XXXXXXXXXX...",
        "................"
    ],
    B: [
        "................",
        "......XXXX......",
        ".....XCCCCX.....",
        "....XCCCCCCX....",
        "....XCHHHHCX....",
        "....XCHSSHCX....",
        "....XCHSSHCX....",
        "...XXCCCCCCXX...",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..", // Compressed torso slightly
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "...XXXXXXXXXX...",
        "................"
    ]
};

const ROGUE_FRAMES = {
    A: [
        "................",
        ".....XXXXXX.....",
        "....XCCCCCCX....",
        "...XCCCHHHCCX...",
        "...XCCSSSSCCX...",
        "...XCCSSSSCCX...",
        "..XCCCCCCCCCCX..",
        ".XACCCCCCCCCCAB.", // B is a special dagger handle logic? using Accent for now
        ".XAACCXCCXCCAAX.",
        ".XAACCXCCXCCAAX.",
        "..XCCXAAAAXCCX..",
        "...XXAAAAAAXX...",
        "...XCCX..XCCX...",
        "...XCCX..XCCX...",
        "...XXXX..XXXX...",
        "................"
    ],
    B: [
        "................",
        "................",
        ".....XXXXXX.....",
        "....XCCCCCCX....",
        "...XCCCHHHCCX...",
        "...XCCSSSSCCX...",
        "---XCCSSSSCCX...", // Head bob
        "..XCCCCCCCCCCX..",
        ".XACCCCCCCCCCAB.",
        ".XAACCXCCXCCAAX.",
        ".XAACCXCCXCCAAX.",
        "..XCCXAAAAXCCX..",
        "...XXAAAAAAXX...",
        "...XCCX..XCCX...",
        "...XCCX..XCCX...",
        "...XXXX..XXXX..."
    ]
};

const CLERIC_FRAMES = {
    A: [
        "................",
        ".....XXXXXX.....",
        "....XHHHHHHX....",
        "....XHSSSSHX....",
        "....XHSSSSHX....",
        "...XXCCCCCCXX...",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "..XCCCAAAACCCX..",
        "..XCCCAAAACCCX..",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "...XXXXXXXXXX...",
        "................"
    ],
    B: [
        "................",
        "................",
        ".....XXXXXX.....",
        "....XHHHHHHX....",
        "....XHSSSSHX....",
        "....XHSSSSHX....",
        "...XXCCCCCCXX...",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "..XCCCAAAACCCX..",
        "..XCCCAAAACCCX..",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "..XCCCCAACCCCX..",
        "...XXXXXXXXXX...",
        "................"
    ]
};

const FRAMES_MAP: Record<string, { A: string[]; B: string[] }> = {
    Warrior: WARRIOR_FRAMES,
    Mage: MAGE_FRAMES,
    Rogue: ROGUE_FRAMES,
    Cleric: CLERIC_FRAMES,
};

export const drawSprite = (
    ctx: CanvasRenderingContext2D,
    heroClass: string,
    colors: HeroColors,
    frame: 'A' | 'B',
    scale: number = 1
) => {
    const map = FRAMES_MAP[heroClass]?.[frame] || WARRIOR_FRAMES[frame];
    const pixelSize = scale;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let y = 0; y < SPRITE_SIZE; y++) {
        const row = map[y];
        if (!row) continue;

        for (let x = 0; x < SPRITE_SIZE; x++) {
            const char = row[x] || '.';
            let fill = '';

            switch (char) {
                case 'X': fill = '#1a1a1a'; break; // Outline
                case 'S': fill = colors.skin; break;
                case 'H': fill = colors.hair; break;
                case 'C': fill = colors.clothing; break;
                case 'A': fill = colors.accent; break;
                case 'B': fill = '#4a4a4a'; break; // Dark Iron
                case '.': fill = ''; break;
                case '-': fill = ''; break; // Placeholder for shifted pixels in raw map
                default: fill = '';
            }

            if (fill) {
                ctx.fillStyle = fill;
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
    }
};

/**
 * Generates a base64 Data URI for the sprite (Frame A) to be used in Metadata
 */
export const generateSpriteURI = (heroClass: string, colors: HeroColors): string => {
    if (typeof document === 'undefined') return ''; // Server-side guard

    const canvas = document.createElement('canvas');
    canvas.width = SPRITE_SIZE * 10; // High res for metadata
    canvas.height = SPRITE_SIZE * 10;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        // Disable smoothing for crisp pixels
        ctx.imageSmoothingEnabled = false;
        drawSprite(ctx, heroClass, colors, 'A', 10);
        return canvas.toDataURL('image/png');
    }
    return '';
};
