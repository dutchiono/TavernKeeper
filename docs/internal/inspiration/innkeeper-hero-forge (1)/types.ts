export type HeroClass = 'Warrior' | 'Mage' | 'Rogue' | 'Cleric';
export type Gender = 'Male' | 'Female' | 'Mystery';

export interface HeroColors {
  skin: string;
  hair: string;
  clothing: string;
  accent: string;
}

export interface HeroMetadata {
  name: string;
  class: HeroClass;
  colors: HeroColors;
  spriteImage: string; // Base64 data URI
}

export const HERO_CLASSES: HeroClass[] = ['Warrior', 'Mage', 'Rogue', 'Cleric'];
export const GENDERS: Gender[] = ['Male', 'Female', 'Mystery'];

export const DEFAULT_COLORS: HeroColors = {
  skin: '#fdbcb4',
  hair: '#8b4513',
  clothing: '#ef4444',
  accent: '#ffffff',
};
