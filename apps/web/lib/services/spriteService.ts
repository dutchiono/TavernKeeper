// Type definitions
export type HeroClass = 'Warrior' | 'Mage' | 'Rogue' | 'Cleric';
export type Gender = 'Male' | 'Female' | 'Mystery';
export type AnimationType = 'idle' | 'walk' | 'emote';

export interface HeroColors {
    skin: string;
    hair: string;
    clothing: string;
    accent: string;
}

export const HERO_CLASSES: HeroClass[] = ['Warrior', 'Mage', 'Rogue', 'Cleric'];
export const GENDERS: Gender[] = ['Male', 'Female', 'Mystery'];

export const DEFAULT_COLORS: HeroColors = {
    skin: '#fdbcb4',
    hair: '#8b4513',
    clothing: '#ef4444',
    accent: '#ffffff',
};

// --- UTILS ---

const getSpriteSize = (map: string[]) => map.length;

/**
 * Darkens or Lightens a hex color.
 */
const shadeColor = (color: string, percent: number) => {
    const f = parseInt(color.slice(1), 16);
    const t = percent < 0 ? 0 : 255;
    const p = percent < 0 ? percent * -1 : percent;
    const R = f >> 16;
    const G = (f >> 8) & 0x00FF;
    const B = f & 0x0000FF;
    return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
};

// --- V5 HIGH-FIDELITY MAPS (STARDEW PROPORTIONS) ---
// 64x64 Grid

// LEGEND:
// . = Transparent
// X = Outline (Black/Dark)
// S = Skin Base, s = Skin Shadow, Y = Skin Highlight
// H = Hair Base, h = Hair Shadow, Z = Hair Highlight
// C = Clothing Base, c = Clothing Shadow, K = Clothing Highlight
// A = Accent Base, a = Accent Shadow, W = White/Silver/Trim
// M = Metal/Grey Base, m = Metal Shadow, L = Metal Highlight
// l = Leather/Brown Base, d = Leather Dark
// E = Eye Pupil (Black/Dark)
// w = Eye White
// F = Foam (White)
// B = Beer (Amber)
// r = Mouth/Rose
// G = Gold/Yellow (Hardcoded for trims)

const WARRIOR_MAP = [
    "................................................................",
    "............................XXXXXX..............................",
    "..........................XXRRRRRRXX............................",
    ".........................XXRRRRRRRRXX...........................",
    ".........................XRRRRRRRRRRX...........................",
    "........................XXMMMMMMMMMMXX..........................",
    ".......................XMMLLMMLLMMLLMMX.........................",
    ".......................XMMLLMMLLMMLLMMX.........................",
    ".......................XMMMMMMMMMMMMMMX.........................",
    ".......................XMMMMXXXXXXMMMMX.........................",
    ".......................XMMMX......XMMMX.........................",
    ".......................XMMMX......XMMMX.........................",
    ".......................XMMMMXXXXXXMMMMX.........................",
    ".......................XMMMMMMMMMMMMMMX.........................",
    ".......................XMMMMMMMMMMMMMMX.........................",
    "......................XXMMMMMMMMMMMMMMXX........................",
    ".....................XMMMMMMMMMMMMMMMMMMX.......................",
    "....................XMMMMMMMMMMMMMMMMMMMMX......................",
    "..................XXMMMMMMMMMMMMMMMMMMMMMMXX....................",
    ".................XLLMMMMMMMMMMMMMMMMMMMMMMLLX...................",
    "................XLLLMMMMMMMMMMMMMMMMMMMMMMLLLX..................",
    "................XLLLMMMMMMMMMMMMMMMMMMMMMMLLLX..................",
    "...............XLLLLMMMMMMMMMMMMMMMMMMMMMMLLLLX.................",
    "...............XLLLLXXXXXXMMMMMMMMMMXXXXXXLLLLX.................",
    "...............XMMMMXCCCCCXXXXXXXXXXCCCCCXMMMMX.................",
    "...............XXXXXXCCCCCCCCCCCCCCCCCCCCXXXXXX.................",
    "....................XCCCCCCCCCCCCCCCCCCCCX......................",
    "....................XCCCCCCCCCCCCCCCCCCCCX......................",
    "....................XCCKKCCCCCCCCCCCCKKCCX......................",
    "....................XCCKKCCCCCCCCCCCCKKCCX......................",
    "....................XCCKKCCCCCCCCCCCCKKCCX......................",
    "....................XCCKKCCCCCCCCCCCCKKCCX......................",
    "....................XCCKKCCCCCCCCCCCCKKCCX......................",
    "....................XCCKKCCCCCCCCCCCCKKCCX......................",
    "....................XCCKKCCCCCCCCCCCCKKCCX......XXX.............",
    "....................XCCKKCCCCCCCCCCCCKKCCX.....XGGX.............",
    "...................XllXXXXXXXXXXXXXXXXXXllX....XGGX.............",
    "...................XllllllllllllllllllllllX...XXllXX............",
    "...................XllXGGXllllllllllXGGXllX...XllllX............",
    "...................XXXXGGXXXXXXXXXXXXGGXXXX...XllllX............",
    "....................XMMMMMMMMMMMMMMMMMMMMX....XllllX............",
    "....................XMMMMMMMMMMMMMMMMMMMMX....XXMMXX............",
    "....................XMMMMMMMMMMMMMMMMMMMMX...XMMMMMMX...........",
    "....................XMMMMMMMMMMMMMMMMMMMMX...XMMMMMMX...........",
    "....................XMMMMMMMMMMMMMMMMMMMMX....XLLLLX............",
    "....................XMMMMMMMMMMMMMMMMMMMMX....XLLLLX............",
    "....................XMMMMMMMMMMMMMMMMMMMMX....XLLLLX............",
    "....................XMMMMMMMMMMMMMMMMMMMMX....XLLLLX............",
    "....................XMMMMMMXXXXXXXXMMMMMMX....XLLLLX............",
    "....................XMMMMMX........XMMMMMX....XLLLLX............",
    "....................XMMMMMX........XMMMMMX....XLLLLX............",
    "....................XMMMMMX........XMMMMMX....XLLLLX............",
    "....................XMMMMMX........XMMMMMX....XLLLLX............",
    "....................XMMMMMX........XMMMMMX....XLLLLX............",
    "...................XMMMMMMX........XMMMMMMX...XLLLLX............",
    "...................XMMMMMMX........XMMMMMMX...XLLLLX............",
    "...................XMMMMMMX........XMMMMMMX...XLLLLX............",
    "...................XMMMMMMX........XMMMMMMX...XXLLXX............",
    "..................XMMMMMMMMX......XMMMMMMMMX....XX..............",
    ".................XMMMMMMMMMMX....XMMMMMMMMMMX...................",
    ".................XXXXXXXXXXXX....XXXXXXXXXXXX...................",
    "................................................................"
];

const MAGE_MAP = [
    "................................................................",
    "..............................XXXX..............................",
    ".............................XCCKKX.............................",
    "............................XCCCCCX.............................",
    "...........................XCCCCCCX.............................",
    "..........................XCCCCCCX..............................",
    ".........................XCCCCCCX...............................",
    "........................XCCCCCCX................................",
    ".......................XCCCCCCX.................................",
    "......................XCCCCCCX..................................",
    ".....................XCCCCCCCX..................................",
    "....................XCCCCCCCCX..................................",
    "...................XCCCCCCCCCCX.................................",
    "..................XCCCCCCCCCCCCX................................",
    ".................XCCCCCCCCCCCCCCX...............................",
    "................XCCCCCCCCCCCCCCCCX..............................",
    "...............XCCCCCCCCCCCCCCCCCCX.............................",
    "..............XccCCCCCCCCCCCCCCCCccX............................",
    ".............XCCCCCCCCCCCCCCCCCCCCCCX...........................",
    "............XCCCCCCCCCCCCCCCCCCCCCCCCX..........................",
    ".............XXXXXXXXXXXXXXXXXXXXXXXX...........................",
    "...............XHHHHHHHHHHHHHHHHHHX.............................",
    "...............XHHHSSSSSwwEEwwSSHHX.............................",
    "...............XHHHSYYYYwwEEwwSYHHX.............................",
    "...............XHHHSSSSSwwwwwwSSHHX.............................",
    "...............XHHHHHSSSSSSSSSSHHHHX............................",
    "...............XHHHHHHHHrrHHHHHHHHHX............................",
    "...............XHHHHHHHHHHHHHHHHHHHX............................",
    "...............XHHHHHHHHHHHHHHHHHHHX............................",
    "...............XHHHHHHHHHHHHHHHHHHHX............................",
    "..............XXHHHHHHHHHHHHHHHHHHHXX...........................",
    ".............XCCHHHHHHHHHHHHHHHHHHHCCX..........................",
    "............XCCCCXHHHHHHHHHHHHHHHXCCCCX.........................",
    "...........XCCCCCCXXXXXXXXXXXXXXXXCCCCCCX........XX.............",
    "..........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX......XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX....XllllX...........",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX....XllllX...........",
    ".........XCCXXXXXXCCCCCCCCCCCCCCCCXXXXXXCCX....XllllX...........",
    ".........XCCXSSSSXCCCCCCCCCCCCCCCCXSSSSXCCX.....XllX............",
    ".........XCCXSSSSXCCCCCCCCCCCCCCCCXSSSSXCCX.....XllX............",
    ".........XCCXXXXXXCCCCCCCCCCCCCCCCXXXXXXCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.....XllX............",
    ".........XCCCCKKKKKKKKKKKKKKKKKKKKKKKKCCCCX.....XllX............",
    ".........XCCCCKKKKKKKKKKKKKKKKKKKKKKKKCCCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.....XllX............",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX....XXllXX...........",
    ".........XCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCX....XXXXXX...........",
    ".........XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.....................",
    "................................................................",
    "................................................................"
];

const ROGUE_MAP = [
    "................................................................",
    "...........................XXXXXXXXXX...........................",
    ".........................XXXccccccccXXX.........................",
    "........................XccccccccccccccX........................",
    ".......................XccccccccccccccccX.......................",
    "......................XcccccXXXXXXcccccccX......................",
    ".....................XcccccXSSSSSSXcccccccX.....................",
    ".....................XccccXSSSSSSSSXccccccX.....................",
    ".....................XccccXSwEEwwESXccccccX.....................",
    ".....................XccccXSwEEwwESXccccccX.....................",
    ".....................XccccXSSSSSSSSXccccccX.....................",
    ".....................XccccXSSSSSSSSXccccccX.....................",
    ".....................XcccccXXXXXXXXcccccccX.....................",
    ".....................XccccccccccccccccccccX.....................",
    ".....................XccccccccccccccccccccX.....................",
    ".....................XccccccccccccccccccccX.....................",
    ".....................XccccccccccccccccccccX.....................",
    "....................XccccccccccccccccccccccX....................",
    "...................XllcccccccccccccccccccllX....................",
    "..................XlllccccccccccccccccccclllX...................",
    ".................XllllcccccccccccccccccccllllX..................",
    "................XlllllccccccccccccccccccclllllX.................",
    "................XlllllXXXXXXccccccXXXXXXclllllX.................",
    "................XlllllXSSSSXccccccXSSSSXclllllX.................",
    "................XlllllXSSSSXccccccXSSSSXclllllX.................",
    "................XlllllXXXXXXccccccXXXXXXclllllX.................",
    "................XllllllllllllllllllllllllllllX..................",
    "................XllllllllllllllllllllllllllllX..................",
    "................XllllXXXXllllllllllllllXXXXllX..................",
    "................XllllXMMXllllllllllllllXMMXllX..................",
    "................XllllXMMXllllllllllllllXMMXllX..................",
    "................XllllXXXXllllllllllllllXXXXllX..................",
    "................XllllllllllllllllllllllllllllX..................",
    "................XllllllllllllllllllllllllllllX..................",
    "................XllllllllllllllllllllllllllllX..................",
    "................XllXXXXXXXXXXXXXXXXXXXXXXllX....................",
    "................XllllllllllllllllllllllllllX....................",
    "................XllllllllllllllllllllllllllX....................",
    "................XcccccLLLLccccccccLLLLcccccX....................",
    "................XcccccLLLLccccccccLLLLcccccX....................",
    "................XcccccLLLLccccccccLLLLcccccX....................",
    "................XcccccLLLLccccccccLLLLcccccX....................",
    "................XcccccLLLLccccccccLLLLcccccX....................",
    "................XcccccLLLLccccccccLLLLcccccX....................",
    "................XcccccLLLLccccccccLLLLcccccX....................",
    "................XcccccLLLLccccccccLLLLcccccX....................",
    "................XcccccLLLLccccccccLLLLcccccX....................",
    "................XcccccLLLLccccccccLLLLcccccX....................",
    "................XcccccLLLLccccccccLLLLcccccX....................",
    "................XcccccLLLLccccccccLLLLcccccX....................",
    "................XcccccLLLLccccccccLLLLcccccX....................",
    "................XcccccLLLLccccccccLLLLcccccX....................",
    "................XlllllLLLLXXXXXXXXLLLLlllllX....................",
    "................XlllllllllX......XlllllllllX....................",
    "................XlllllllllX......XlllllllllX....................",
    "................XXXXXXXXXXX......XXXXXXXXXXX...................."
];

const CLERIC_MAP = [
    "................................................................",
    "...........................XXXXXXXXXX...........................",
    ".........................XXWWWWWWWWWWXX.........................",
    "........................XWWWWWWWWWWWWWWX........................",
    ".......................XWWWWWWGGWWWWWWWWX.......................",
    ".......................XWWWWWWGGWWWWWWWWX.......................",
    ".......................XWWWWGGGGGGWWWWWWX.......................",
    ".......................XWWWWWWGGWWWWWWWWX.......................",
    ".......................XWWWWWWGGWWWWWWWWX.......................",
    ".......................XWWWWWWGGWWWWWWWWX.......................",
    ".......................XWWWWWWWWWWWWWWWWX.......................",
    ".......................XWWWWWWWWWWWWWWWWX.......................",
    ".......................XWWWWWWWWWWWWWWWWX.......................",
    ".......................XWWWWWWWWWWWWWWWWX.......................",
    ".......................XHHHHHHHHHHHHHHHHX.......................",
    ".......................XHHHHHHHHHHHHHHHHX.......................",
    ".......................XHHHSSSSSwwEEwwSSHX......................",
    ".......................XHHHSYYYYwwEEwwSYHX......................",
    ".......................XHHHSSSSSwwwwwwSSHX......................",
    ".......................XHHHHHSSSSSSSSSSHHX......................",
    ".......................XHHHHHHHHHHHHHHHHHX......................",
    "......................XXCCCCCCCCCCCCCCCCXX......................",
    ".....................XCCCCCCCCCCCCCCCCCCCCX.....................",
    "....................XCCCAAAAAAAAAAAAAAAACCX.....................",
    "...................XCCCAAAAAAAAAAAAAAAAAACCX....................",
    "..................XCCCAAAAAAAAAAAAAAAAAAAACCX...................",
    "..................XCCCAAAAAAAAAAAAAAAAAAAACCX...................",
    "..................XCCCAAAAAAAAAAAAAAAAAAAACCX...................",
    "..................XCCCAAAAAAAAAAAAAAAAAAAACCX...................",
    "..................XCCCAAAAGGGGGGGGGGAAAAAACCX...................",
    "..................XCCCAAAAGGGGGGGGGGAAAAAACCX...................",
    "..................XCCCAAAAGGGGGGGGGGAAAAAACCX...................",
    "..................XCCCAAAAGGGGGGGGGGAAAAAACCX...................",
    "..................XCCCAAAAAAAAAAAAAAAAAAAACCX...................",
    "..................XCCCAAAAAAAAAAAAAAAAAAAACCX...................",
    "..................XCCCAAAAAAAAAAAAAAAAAAAACCX.......XXXX........",
    "..................XCCCAAAAAAAAAAAAAAAAAAAACCX......XGGGGX.......",
    "..................XCCXXXXXXAAAAAAAAXXXXXXACCX.....XGGGGGGX......",
    "..................XCCXSSSSXAAAAAAAAXSSSSXACCX.....XGGGGGGX......",
    "..................XCCXSSSSXAAAAAAAAXSSSSXACCX......XGGGGX.......",
    "..................XCCXXXXXXAAAAAAAAXXXXXXACCX.......XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX.......XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX.......XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX.......XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX.......XllX........",
    "..................XCCCKKKKKKKKKKKKKKKKKKCCCX........XllX........",
    "..................XCCCKKKKKKKKKKKKKKKKKKCCCX........XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX.......XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX.......XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX.......XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX.......XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX.......XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX.......XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX.......XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX.......XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX.......XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX.......XllX........",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX......XXllXX.......",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCX......XXXXXX.......",
    "..................XXXXXXXXXXXXXXXXXXXXXXXXXXX..................."
];

const KEEPER_MALE_MAP = [
    "................................................................",
    "...........................XXXXXXXXXX...........................",
    ".........................XXHHHHHHHHHHXX.........................",
    "........................XHHHHHHHHHHHHHHX........................",
    ".......................XHHHHZZZHHZZZHHHHX.......................",
    "......................XHHHHHZZZHHZZZHHHHHX......................",
    "......................XHHHHHHHHHHHHHHHHHHX......................",
    "......................XHHHHHHHHHHHHHHHHHHX......................",
    "......................XHHHHHHHHHHHHHHHHHHX......................",
    "......................XHHHSSSSSSSSSSSSHHHX......................",
    "......................XHHSSSSSSSSSSSSSSHHX......................",
    "......................XHHSwwwEEwwEEEwwwSHX......................",
    "......................XHHSwwwEEwwEEEwwwSHX......................",
    "......................XHHSwwwwwwwwwwwwwSHX......................",
    "......................XHHSsssSSSSSSsssSSHX......................",
    "......................XHHSsssSSSSSSsssSSHX......................",
    "......................XHHSSHHHHHHHHHHSSHHX......................",
    "......................XHHSHHHHHHHHHHHHSHHX......................",
    "......................XHHHHHHHHHHHHHHHHHHX......................",
    "......................XHHHHHHHHHHHHHHHHHHX......................",
    ".....................XXHHHHHHHHHHHHHHHHHHXX.....................",
    "...................XXCCCCCCCCCCCCCCCCCCCCCCXX...................",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCCX..................",
    ".................XCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.................",
    "................XCCCCCCAAAAAACCCCCCAAAAAACCCCCCX................",
    "................XCCCCCCAAAAAACCCCCCAAAAAACCCCCCX................",
    "................XCCCCCCAAAAAACCCCCCAAAAAACCCCCCX................",
    "................XCCCCCCAAAAAACCCCCCAAAAAACCCCCCX................",
    "................XSSSSSSAAAAAASSSSSSAAAAAASSSSSSX................",
    "................XSSSSSSAAAAAASSSSSSAAAAAASSSSSSX................",
    "................XSSSSSSAAAAAASSSSSSAAAAAASSSSSSX................",
    "................XSSSSXXXAAAAAXXXXXXAAAAAAXXXSSSX................",
    "................XSSSXX.XAAAAAAX..XAAAAAAX..XXSSX................",
    "................XXXXX..XAAAAAAX..XAAAAAAX...XXXX................",
    ".................XMMX..XAAAAAAX..XAAAAAAX...XFFX................",
    ".................XMBX..XAAAAAAX..XAAAAAAX...XFFX................",
    ".................XMBX..XAAAAAAX..XAAAAAAX...XFFX................",
    ".................XMBX..XAAAAAAX..XAAAAAAX...XFFX................",
    ".................XMBX..XAAAAAAX..XAAAAAAX...XFFX................",
    ".................XMMX..XAAAAAAX..XAAAAAAX...XFFX................",
    ".................XXXX..XAAAAAAX..XAAAAAAX...XXXX................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XllXXXllXXllXXXllX.......................",
    ".......................XllX.XllXXllX.XllX.......................",
    ".......................XllX.XllXXllX.XllX.......................",
    ".......................XXXX.XXXXXXXX.XXXX......................."
];

const KEEPER_FEMALE_MAP = [
    "................................................................",
    "...........................XXXXXXXXXX...........................",
    ".........................XXHHHHHHHHHHXX.........................",
    "........................XHHHHHHHHHHHHHHX........................",
    ".......................XHHHHHHHHHHHHHHHHX.......................",
    "......................XHHHHZZZHHHHHHZZZHHX......................",
    "......................XHHHHZZZHHHHHHZZZHHX......................",
    "......................XHHHHHHHHHHHHHHHHHHX......................",
    "......................XHHHHHHHHHHHHHHHHHHX......................",
    "......................XHHHHHHHHHHHHHHHHHHX......................",
    "......................XHHHSSSSSSSSSSSSHHHX......................",
    "......................XHHSSSSSSSSSSSSSSHHX......................",
    "......................XHHSwwwEEwwEEEwwwSHX......................",
    "......................XHHSwwwwwwwwwwwwwSHX......................",
    "......................XHHSsssSSSSSSsssSSHX......................",
    "......................XHHSsssrrssrrsssSSHX......................",
    "......................XHHSSSSSSSSSSSSSSHHX......................",
    "......................XHHHHHHHHHHHHHHHHHHX......................",
    "......................XHHHHHHHHHHHHHHHHHHX......................",
    "......................XHHHHHHHHHHHHHHHHHHX......................",
    ".....................XXHHHHHHHHHHHHHHHHHHXX.....................",
    "...................XXCCCCCCCCCCCCCCCCCCCCCCXX...................",
    "..................XCCCCCCCCCCCCCCCCCCCCCCCCCCX..................",
    ".................XCCCCCCCCCCCCCCCCCCCCCCCCCCCCX.................",
    "................XCCCCCCAAAAAACCCCCCAAAAAACCCCCCX................",
    "................XCCCCCCAAAAAACCCCCCAAAAAACCCCCCX................",
    "................XCCCCCCAAAAAACCCCCCAAAAAACCCCCCX................",
    "................XCCCCCCAAAAAACCCCCCAAAAAACCCCCCX................",
    "................XSSSSSSAAAAAASSSSSSAAAAAASSSSSSX................",
    "................XSSSSSSAAAAAASSSSSSAAAAAASSSSSSX................",
    "................XSSSSSSAAAAAASSSSSSAAAAAASSSSSSX................",
    "................XSSSSXXXAAAAAXXXXXXAAAAAAXXXSSSX................",
    "................XSSSXX.XAAAAAAX..XAAAAAAX..XXSSX................",
    "................XXXXX..XAAAAAAX..XAAAAAAX...XXXX................",
    ".................XFFX..XAAAAAAX..XAAAAAAX...XMMX................",
    ".................XFFX..XAAAAAAX..XAAAAAAX...XMMX................",
    ".................XFFX..XAAAAAAX..XAAAAAAX...XMMX................",
    ".................XFFX..XAAAAAAX..XAAAAAAX...XMMX................",
    ".................XFFX..XAAAAAAX..XAAAAAAX...XMMX................",
    ".................XFFX..XAAAAAAX..XAAAAAAX...XMMX................",
    ".................XXXX..XAAAAAAX..XAAAAAAX...XXXX................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    ".......................XAAAAAAX..XAAAAAAX.......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    ".....................XAAAAAAAAAAAAAAAAAAAAX.....................",
    "....................XAAAAAAAAAAAAAAAAAAAAAAX....................",
    "...................XAAAAAAAAAAAAAAAAAAAAAAAAX...................",
    "..................XAAAAAAAAAAAAAAAAAAAAAAAAAAX..................",
    ".................XAAAAAAAAAAAAAAAAAAAAAAAAAAAAX.................",
    "................XAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAX................",
    "...............XAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAX...............",
    "..............XAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAX..............",
    ".............XAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAX.............",
    "............XAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAX............",
    "...........XllXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXllX...........",
    "...........XllX..................................XllX...........",
    "...........XllX..................................XllX...........",
    "...........XXXX..................................XXXX..........."
];

const KEEPER_MYSTERY_MAP = [
    "................................................................",
    "...........................XXXXXXXXXX...........................",
    ".........................XXccccccccccXX.........................",
    "........................XccccccccccccccX........................",
    ".......................XccccccccccccccccX.......................",
    "......................XccccccccccccccccccX......................",
    "......................XccccccccccccccccccX......................",
    "......................XcccccXXXXXXXXcccccX......................",
    "......................XcccccXSSSSSSXcccccX......................",
    "......................XcccccXSSSSSSXcccccX......................",
    "......................XcccccXSwEEwSXcccccX......................",
    "......................XcccccXSwEEwSXcccccX......................",
    "......................XcccccXSSSSSSXcccccX......................",
    "......................XcccccXSSSSSSXcccccX......................",
    "......................XcccccXSSSSSSXcccccX......................",
    "......................XcccccXXXXXXXXcccccX......................",
    "......................XccccccccccccccccccX......................",
    "......................XccccccccccccccccccX......................",
    "......................XccccccccccccccccccX......................",
    "......................XccccccccccccccccccX......................",
    ".....................XXccccccccccccccccccXX.....................",
    "...................XXccccccccccccccccccccccXX...................",
    "..................XccccccccccccccccccccccccccX..................",
    ".................XcccXAAAAAAAAAAAAAAAAAAAAXcccX.................",
    "................XcccXAAAAAAAAAAAAAAAAAAAAAAXcccX................",
    "................XcccXAAAAAAAAAAAAAAAAAAAAAAXcccX................",
    "................XcccXAAAAAAAAAAAAAAAAAAAAAAXcccX................",
    "................XcccXAAAAAAAAAAAAAAAAAAAAAAXcccX................",
    "................XcccXAAAAAAAAAAAAAAAAAAAAAAXcccX................",
    "................XcccXAAAAAAAAAAAAAAAAAAAAAAXcccX................",
    "................XcccXAAAAAAAAAAAAAAAAAAAAAAXcccX................",
    "................XcccXXAAAAAAAAAAAAAAAAAAAAXXcccX................",
    "................XcccX.XAAAAAAAAAAAAAAAAAAX.XcccX................",
    "................XXXXX.XAAAAAAAAAAAAAAAAAAX.XXXXX................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XAAAAAAAAAAAAAAAAAAX......................",
    "......................XllXXXXXXXXXXXXXXllX......................",
    "......................XllX............XllX......................",
    "......................XllX............XllX......................",
    "......................XXXX............XXXX......................"
];

// --- ANIMATION LOGIC ---

// Helper to shift rows
const shiftRows = (map: string[], dy: number): string[] => {
    const size = getSpriteSize(map);
    if (dy === 0) return [...map];

    const emptyRow = ".".repeat(size);
    if (dy > 0) {
        // Shift Down (Pad Top)
        return [...Array(dy).fill(emptyRow), ...map.slice(0, size - dy)];
    } else {
        // Shift Up (Pad Bottom)
        return [...map.slice(-dy, size), ...Array(-dy).fill(emptyRow)];
    }
};

// Helper to shift specific pixels (e.g. Arms)
const shiftPixels = (map: string[], charSet: Set<string>, dx: number, dy: number, minX: number = 0, maxX: number = 64): string[] => {
    const newMap = map.map(row => row.split(''));
    const size = map.length;

    for (let y = 0; y < size; y++) {
        for (let x = minX; x < maxX; x++) {
            const char = map[y][x];
            if (charSet.has(char)) {
                // Clear original
                newMap[y][x] = '.';
            }
        }
    }

    for (let y = 0; y < size; y++) {
        for (let x = minX; x < maxX; x++) {
            const char = map[y][x];
            if (charSet.has(char)) {
                // Place new
                const ny = y + dy;
                const nx = x + dx;
                if (ny >= 0 && ny < size && nx >= 0 && nx < size) {
                     newMap[ny][nx] = char;
                }
            }
        }
    }
    return newMap.map(row => row.join(''));
};

// Procedural Walk
const getWalkFrame = (base: string[], frame: number): string[] => {
    const size = base.length;
    let modified = [...base];

    // Frames: 0=Stand, 1=Bob+StepR, 2=Stand, 3=Bob+StepL
    const bob = (frame === 1 || frame === 3) ? 1 : 0;

    if (bob) {
        // Shift body down 1 pixel
        modified = shiftRows(modified, 1);

        // Find feet (bottom 4 rows)
        const feetStart = size - 6;

        // Split rows
        modified = modified.map((row, y) => {
            if (y < feetStart) return row;
            // This is a foot row
            const chars = row.split('');
            // Left foot is left side (0-31), Right is right (32-63)
            // If frame 1: Right step (Shift Right side pixels Right)
            // If frame 3: Left step (Shift Left side pixels Left)

            const newRow = Array(size).fill('.');

            for(let x=0; x<size; x++) {
                if (frame === 1) {
                    if (x > 32 && chars[x] !== '.') {
                        // Shift right
                         if(x+1 < size) newRow[x+1] = chars[x];
                    } else if (chars[x] !== '.') {
                         newRow[x] = chars[x];
                    }
                } else if (frame === 3) {
                     if (x < 32 && chars[x] !== '.') {
                        // Shift left
                         if(x-1 >= 0) newRow[x-1] = chars[x];
                    } else if (chars[x] !== '.') {
                         newRow[x] = chars[x];
                    }
                } else {
                    newRow[x] = chars[x];
                }
            }
            return newRow.join('');
        });
    }
    return modified;
};

// Procedural Emote
const getEmoteFrame = (base: string[], type: HeroClass | Gender, isKeeper: boolean): string[] => {
    // Frame 1 is Action. Frame 0 is base.

    if (isKeeper) {
        // Keeper: Lift Mug (Right side items)
        const mugChars = new Set(['M', 'B', 'F']);
        // Shift mug up 4 pixels and left 2 pixels (towards face)
        return shiftPixels(base, mugChars, -2, -4, 32, 64);
    }

    switch (type) {
        case 'Warrior':
            // Lift Sword (Right side, metal/gold/leather)
            const swordChars = new Set(['L', 'M', 'G', 'l', 'X']);
            // Crude heuristic: Only shift right-side weapon parts
            return shiftPixels(base, swordChars, 0, -6, 36, 64);

        case 'Mage':
            // Lift Staff
            const staffChars = new Set(['l', 'X', 'C', 'S']); // Staff is wood(l)
            return shiftPixels(base, staffChars, 0, -4, 36, 64);

        case 'Cleric':
            // Raise Staff
            const clericStaff = new Set(['l', 'G', 'X']);
            return shiftPixels(base, clericStaff, 0, -4, 36, 64);

        case 'Rogue':
            // Crouch: Shift whole body down, but lift daggers
            let crouch = shiftRows(base, 2);
            // Lift daggers (Metal)
            const daggers = new Set(['M', 'X']);
            return shiftPixels(crouch, daggers, 0, -3, 0, 64);

        default:
            return base;
    }
};

export const getFramesForEntity = (
    type: HeroClass | Gender,
    anim: AnimationType,
    isKeeper: boolean
): string[][] => {
    let base: string[] = [];

    if (isKeeper) {
        switch(type) {
            case 'Male': base = KEEPER_MALE_MAP; break;
            case 'Female': base = KEEPER_FEMALE_MAP; break;
            case 'Mystery': base = KEEPER_MYSTERY_MAP; break;
            default: base = KEEPER_MALE_MAP;
        }
    } else {
        switch(type) {
            case 'Warrior': base = WARRIOR_MAP; break;
            case 'Mage': base = MAGE_MAP; break;
            case 'Rogue': base = ROGUE_MAP; break;
            case 'Cleric': base = CLERIC_MAP; break;
            default: base = WARRIOR_MAP;
        }
    }

    if (anim === 'idle') {
        // Simple breathing (0, 1)
        // 0 = Base
        // 1 = Body Shift Down 1 (Exhale)
        return [base, shiftRows(base, 1)];
    }

    if (anim === 'walk') {
        return [
            getWalkFrame(base, 0),
            getWalkFrame(base, 1),
            getWalkFrame(base, 2),
            getWalkFrame(base, 3),
        ];
    }

    if (anim === 'emote') {
        return [
            base,
            getEmoteFrame(base, type, isKeeper),
            getEmoteFrame(base, type, isKeeper), // Hold pose
            base
        ];
    }

    return [base];
};

export const drawSpriteFrame = (
  ctx: CanvasRenderingContext2D,
  type: HeroClass | Gender,
  colors: HeroColors,
  anim: AnimationType,
  frameIndex: number,
  pixelScale: number = 1,
  dx: number = 0,
  dy: number = 0,
  isKeeper: boolean = false
) => {
  const frames = getFramesForEntity(type, anim, isKeeper);
  const map = frames[frameIndex % frames.length];
  const size = getSpriteSize(map);

  // Advanced Palette Generation (Base, Shadow, Highlight)
  const palette: Record<string, string | null> = {
      // Skin
      S: colors.skin,
      s: shadeColor(colors.skin, -0.2),
      Y: shadeColor(colors.skin, 0.15),

      // Hair
      H: colors.hair,
      h: shadeColor(colors.hair, -0.25),
      Z: shadeColor(colors.hair, 0.3),

      // Clothing (Primary)
      C: colors.clothing,
      c: shadeColor(colors.clothing, -0.3),
      K: shadeColor(colors.clothing, 0.25),

      // Accent / Secondary
      A: colors.accent,
      a: shadeColor(colors.accent, -0.25),
      W: '#e5e7eb', // Silver/White for details
      G: '#fbbf24', // Gold trim

      // Metal / Greys
      M: '#9ca3af',
      m: '#4b5563',
      L: '#f3f4f6',
      R: '#dc2626', // Plume Red

      // Leather / Boots
      l: '#5c3a1e',
      d: '#3e2613',

      // Details
      X: '#0f0f10', // Outline (Almost Black)
      E: '#09090b', // Eye Pupil
      w: '#ffffff', // Eye White
      r: '#9f1239', // Rose/Mouth
      F: '#ffffff', // Foam
      B: '#f59e0b', // Beer
      '.': null // Transparent
  };

  for (let y = 0; y < size; y++) {
    const row = map[y];
    if(!row) continue;

    for (let x = 0; x < size; x++) {
      const char = row[x];
      const fill = palette[char];

      if (fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(
            dx + (x * pixelScale),
            dy + (y * pixelScale),
            pixelScale,
            pixelScale
        );
      }
    }
  }
};

export const generateSpriteURI = (type: HeroClass | Gender, colors: HeroColors, isKeeper: boolean = false): string => {
    if (typeof document === 'undefined') return ''; // Server-side guard

    const canvas = document.createElement('canvas');
    // Using 64x64 maps now
    const size = 64;

    // Scale up for the URI image
    const exportScale = 8;

    canvas.width = size * exportScale;
    canvas.height = size * exportScale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawSpriteFrame(ctx, type, colors, 'idle', 0, exportScale, 0, 0, isKeeper);

    return canvas.toDataURL('image/png');
};
