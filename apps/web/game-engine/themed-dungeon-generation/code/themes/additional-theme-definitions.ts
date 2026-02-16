/**
 * Additional Theme Definitions
 * 
 * Expands the available dungeon themes with new varieties.
 */

import type { DungeonTheme } from '../types/dungeon-generation';

/**
 * Additional dungeon themes for content variety
 */
export const ADDITIONAL_DUNGEON_THEMES: DungeonTheme[] = [
  {
    id: 'goblin_caves',
    name: 'Goblin Caves',
    description: 'A crude network of tunnels carved by generations of goblins. The walls are rough-hewn and marked with tribal symbols, and the air reeks of goblin cooking fires.',
    monsterTypes: [
      'Goblin',
      'Goblin Shaman',
      'Hobgoblin',
      'Bugbear',
      'Goblin Warchief',
      'Cave Troll',
      'Giant Bat',
    ],
    roomTypes: ['combat', 'safe', 'trap', 'treasure'],
    atmosphere: 'Smoke from cooking fires drifts through narrow passages. Tribal drums echo in the distance, and crude traps line the walls. The goblins have made this place their home.',
    bossInfluences: ['Goblin King', 'Bugbear Chief', 'Cave Troll Lord'],
    metadata: {
      color: '#8b7355',
      music: 'tribal_drums',
      difficulty: 'beginner',
    },
  },
  {
    id: 'abandoned_mine',
    name: 'Abandoned Mine',
    description: 'Once a thriving mining operation, this dungeon has been abandoned after miners dug too deep and awakened something dark. Rusty equipment and old minecarts remain.',
    monsterTypes: [
      'Giant Rat',
      'Kobold',
      'Dark Dwarf',
      'Earth Elemental',
      'Cave Fisher',
      'Rust Monster',
      'Umber Hulk',
    ],
    roomTypes: ['combat', 'safe', 'trap', 'treasure'],
    atmosphere: 'Ancient mining equipment lies abandoned and rusting. Support beams creak ominously, and the deeper you go, the more unstable the tunnels become. Something lurks in the deepest shafts.',
    bossInfluences: ['Dark Dwarf King', 'Earth Titan', 'Ancient Umber Hulk'],
    metadata: {
      color: '#5a4a3a',
      music: 'eerie_silence',
      difficulty: 'beginner',
    },
  },
  {
    id: 'haunted_crypt',
    name: 'Haunted Crypt',
    description: 'An ancient burial ground where restless spirits walk. The dead here were not laid to rest properly, and now they seek revenge on the living.',
    monsterTypes: [
      'Ghost',
      'Specter',
      'Poltergeist',
      'Shadow',
      'Wraith',
      'Banshee',
      'Phantom',
    ],
    roomTypes: ['combat', 'safe', 'trap', 'treasure'],
    atmosphere: 'Cold spots and spectral wails fill the air. Ghostly apparitions phase through walls, and the temperature drops as you venture deeper. The boundary between life and death is thin here.',
    bossInfluences: ['Banshee Queen', 'Phantom Lord', 'Death Wraith'],
    metadata: {
      color: '#4a4a6a',
      music: 'ghostly_whispers',
      difficulty: 'intermediate',
    },
  },
  {
    id: 'dark_forest_ruins',
    name: 'Dark Forest Ruins',
    description: 'Ancient stone structures consumed by a cursed forest. Dark magic has corrupted the natural growth, creating twisted vegetation and feral beasts.',
    monsterTypes: [
      'Dire Wolf',
      'Corrupted Ent',
      'Dark Druid',
      'Werewolf',
      'Owlbear',
      'Displacer Beast',
      'Shambling Mound',
    ],
    roomTypes: ['combat', 'safe', 'trap', 'treasure'],
    atmosphere: 'Twisted roots break through ancient stonework. The canopy above blocks all natural light, and predatory eyes watch from the shadows. Nature itself has turned hostile.',
    bossInfluences: ['Corrupted Ancient', 'Werewolf Alpha', 'Dark Druid Master'],
    metadata: {
      color: '#2d4a2d',
      music: 'dark_forest',
      difficulty: 'intermediate',
    },
  },
  {
    id: 'bandit_hideout',
    name: 'Bandit Hideout',
    description: 'A fortified stronghold deep in the wilderness, used by a ruthless bandit gang. They have trapped and fortified their base against intruders.',
    monsterTypes: [
      'Bandit',
      'Bandit Archer',
      'Bandit Captain',
      'Mercenary',
      'Assassin',
      'Rogue',
      'Bandit Lord',
    ],
    roomTypes: ['combat', 'safe', 'trap', 'treasure'],
    atmosphere: 'The smell of ale and weapon oil permeates the air. Guards patrol the corridors, and tripwires crisscross the passages. This is a human threat, cunning and organized.',
    bossInfluences: ['Bandit King', 'Master Assassin', 'Crime Lord'],
    metadata: {
      color: '#6a4a3a',
      music: 'tense_stealth',
      difficulty: 'intermediate',
    },
  },
  {
    id: 'ancient_temple',
    name: 'Ancient Temple',
    description: 'A forgotten temple to dark gods, filled with arcane traps and zealous guardians. The ancient magic here is both powerful and dangerous.',
    monsterTypes: [
      'Cultist',
      'Dark Priest',
      'Temple Guardian',
      'Flesh Golem',
      'Gargoyle',
      'Medusa',
      'Demon',
    ],
    roomTypes: ['combat', 'safe', 'trap', 'treasure'],
    atmosphere: 'Eldritch symbols glow faintly on stone walls. Ancient machinery still functions, powered by dark rituals. The very air hums with forbidden magic waiting to be unleashed.',
    bossInfluences: ['High Priest', 'Demon Lord', 'Ancient Guardian'],
    metadata: {
      color: '#4a2a4a',
      music: 'ritual_chanting',
      difficulty: 'advanced',
    },
  },
  {
    id: 'dragon_lair',
    name: 'Dragon Lair',
    description: 'The domain of an ancient dragon, carved deep into mountain rock. The dragon has amassed a legendary hoard and commands lesser creatures as servants.',
    monsterTypes: [
      'Kobold Servant',
      'Dragonborn Warrior',
      'Wyvern',
      'Young Dragon',
      'Dragon Cultist',
      'Fire Drake',
      'Ancient Dragon',
    ],
    roomTypes: ['combat', 'safe', 'trap', 'treasure'],
    atmosphere: 'Heat radiates from deep within the mountain. The scent of sulfur and gold fills the air. Dragon scales and bones litter the passages, trophies of past challengers who failed.',
    bossInfluences: ['Ancient Dragon', 'Dragon Lord', 'Wyrm King'],
    metadata: {
      color: '#8b0000',
      music: 'epic_dragon',
      difficulty: 'advanced',
    },
  },
];

/**
 * Get all additional dungeon themes
 */
export function getAdditionalDungeonThemes(): DungeonTheme[] {
  return ADDITIONAL_DUNGEON_THEMES;
}
