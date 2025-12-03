/**
 * Rich Content Generator
 * 
 * Generates rich, verbose content with history, provenance, and lore.
 * Simulates world-content-hierarchy and world-generation-system integration.
 */

import type { MapFeature, Dungeon } from '../types/map-generation';

export interface RichFeatureContent {
  feature: MapFeature;
  history: string;
  provenance: {
    creator?: string;
    createdBy?: string;
    age?: number;
    origin?: string;
  };
  lore: {
    story: string;
    significance: string;
    connections: string[];
  };
  inhabitants?: {
    type: string;
    name?: string;
    leader?: string;
    description: string;
  }[];
  events?: Array<{
    type: string;
    description: string;
    timeAgo: string;
  }>;
}

export interface RichDungeonContent {
  dungeon: Dungeon;
  history: string;
  provenance: {
    builder?: string;
    builtBy?: string;
    age?: number;
    purpose?: string;
  };
  lore: {
    story: string;
    significance: string;
  };
  mainBoss?: {
    name: string;
    type: string;
    level: number;
    description: string;
    history: string;
    powers: string[];
  };
  midBosses?: Array<{
    name: string;
    type: string;
    level: number;
    description: string;
  }>;
  notableRooms?: Array<{
    level: number;
    roomName: string;
    description: string;
  }>;
}

export class RichContentGenerator {
  private createRNG(seed: string): () => number {
    let hash = this.hashString(seed);
    return () => {
      hash = ((hash * 9301) + 49297) % 233280;
      return hash / 233280;
    };
  }

  /**
   * Generate rich content for a surface feature
   */
  generateFeatureContent(feature: MapFeature, cellSeed: string): RichFeatureContent {
    const rng = this.createRNG(`${cellSeed}-rich-${feature.id}`);
    const geoType = feature.metadata?.geographyType as string;
    const orgType = feature.metadata?.organizationType as string;

    let history = '';
    let story = '';
    let significance = '';
    let creator: string | undefined;
    let createdBy: string | undefined;
    let age: number | undefined;
    let origin: string | undefined;
    const connections: string[] = [];
    const inhabitants: RichFeatureContent['inhabitants'] = [];
    const events: RichFeatureContent['events'] = [];

    if (feature.type === 'geography') {
      // Generate rich geography content
      const ages = [50, 100, 200, 500, 1000, 2000];
      age = ages[Math.floor(rng() * ages.length)];

      const creators = [
        'The Stone Shaper',
        'The Wind Rider',
        'The Deep One',
        'The Life Giver',
        'Ancient cosmic forces',
      ];
      creator = creators[Math.floor(rng() * creators.length)];
      createdBy = creator;

      const geoStories: Record<string, string[]> = {
        forest: [
          `This ancient forest was shaped by ${creator} ${age} years ago. The trees here are older than most civilizations, their roots reaching deep into the earth.`,
          `Formed in an age long past, this forest has witnessed countless seasons. ${creator} planted the first seeds here, and the forest has grown wild and untamed ever since.`,
        ],
        plains: [
          `These vast plains were created by ${creator} ${age} years ago. The endless grasslands stretch to the horizon, home to nomadic tribes and wild beasts.`,
          `Once a barren wasteland, ${creator} blessed this land ${age} years ago, creating fertile plains that have supported life for generations.`,
        ],
        mountain: [
          `These mountains were raised by ${creator} ${age} years ago in a great upheaval. The peaks pierce the clouds, their stone faces weathered by time.`,
          `Forged by ${creator} ${age} years ago, these mountains have stood as silent guardians over the land, their secrets buried deep within.`,
        ],
        river: [
          `This river was carved by ${creator} ${age} years ago, flowing from distant mountains to the sea. Its waters have sustained countless settlements.`,
          `Born from the tears of ${creator} ${age} years ago, this river has been a lifeline for the region, its course unchanged for millennia.`,
        ],
        desert: [
          `This desert was formed by ${creator} ${age} years ago, a harsh landscape of sand and stone. Few can survive its unforgiving climate.`,
          `Created by ${creator} ${age} years ago, this desert was once a fertile land. A great cataclysm turned it to sand, and it has remained barren ever since.`,
        ],
      };

      const stories = geoStories[geoType] || geoStories.plains;
      story = stories[Math.floor(rng() * stories.length)];

      // Add inhabitants for certain geography types
      if (geoType === 'plains' && rng() < 0.6) {
        const banditLeaders = [
          'Blackthorn the Ruthless',
          'Grimjaw the Cutthroat',
          'Shadowblade',
          'Ironfist the Bandit King',
          'Raven the Raider',
        ];
        const leader = banditLeaders[Math.floor(rng() * banditLeaders.length)];
        inhabitants.push({
          type: 'bandits',
          name: `The ${leader.split(' ')[0]} Bandits`,
          leader,
          description: `A band of ruthless bandits led by ${leader} prowl these plains, preying on travelers and merchants. They are known for their cruelty and have evaded capture for years.`,
        });
      }

      if (geoType === 'forest' && rng() < 0.4) {
        inhabitants.push({
          type: 'creatures',
          name: 'Forest Guardians',
          description: 'Mysterious creatures dwell in the depths of this forest, rarely seen but always watching. Some say they are the spirits of the trees themselves.',
        });
      }

      significance = `This ${geoType} has been a significant landmark for ${age} years, shaping the lives of those who live nearby.`;

      // Add historical events
      if (rng() < 0.7) {
        const eventTypes = [
          { type: 'battle', desc: 'A great battle was fought here', time: 'decades' },
          { type: 'discovery', desc: 'Ancient ruins were discovered', time: 'years' },
          { type: 'cataclysm', desc: 'A great storm reshaped the land', time: 'centuries' },
        ];
        const event = eventTypes[Math.floor(rng() * eventTypes.length)];
        events.push({
          type: event.type,
          description: event.desc,
          timeAgo: event.time,
        });
      }
    } else if (feature.type === 'organization') {
      // Generate rich organization content
      const ages = [10, 25, 50, 100, 200, 500];
      age = ages[Math.floor(rng() * ages.length)];

      const orgStories: Record<string, string[]> = {
        kingdom: [
          `This kingdom was founded ${age} years ago by a legendary warrior-king. It has grown from a small settlement to a powerful realm, its walls standing strong against all threats.`,
          `Established ${age} years ago, this kingdom has weathered wars, plagues, and famines. Its people are resilient, their culture rich with tradition and honor.`,
        ],
        tower: [
          `This necromancer tower was built ${age} years ago by a dark sorcerer seeking immortality. The tower pulses with dark magic, and few dare approach its shadowed walls.`,
          `Raised ${age} years ago through forbidden rituals, this tower serves as a beacon of dark power. The necromancer who built it still dwells within, conducting terrible experiments.`,
        ],
        horde: [
          `This orc horde has been camped here for ${age} years, growing in strength and numbers. They are led by a brutal war-chief who dreams of conquest.`,
          `Established ${age} years ago after a great migration, this horde has become a feared force in the region. Their war drums echo across the plains, a warning to all who hear them.`,
        ],
        town: [
          `This town was founded ${age} years ago by settlers seeking a new life. It has grown into a bustling community, its markets filled with traders from distant lands.`,
          `Built ${age} years ago at a crossroads, this town has prospered through trade. Its people are hardworking and friendly, always welcoming to travelers.`,
        ],
        graveyard: [
          `This ancient graveyard has existed for ${age} years, the final resting place of countless souls. Some say the dead do not rest peacefully here.`,
          `Established ${age} years ago after a great plague, this graveyard holds the remains of thousands. Dark magic has tainted the ground, and the undead sometimes rise from their graves.`,
        ],
      };

      const stories = orgStories[orgType] || orgStories.town;
      story = stories[Math.floor(rng() * stories.length)];

      // Add leader for organizations
      if (orgType === 'kingdom' || orgType === 'horde' || orgType === 'tower') {
        const leaders: Record<string, string[]> = {
          kingdom: ['King Aethelred', 'Queen Isolde', 'Lord Blackwood', 'Duke Valerius'],
          horde: ['War-Chief Grubnak', 'Chieftain Bloodaxe', 'Warlord Skullcrusher'],
          tower: ['Necromancer Malachar', 'Lich Lord Vex', 'Dark Mage Zephyr'],
        };
        const leaderList = leaders[orgType] || [];
        if (leaderList.length > 0) {
          const leaderName = leaderList[Math.floor(rng() * leaderList.length)];
          inhabitants.push({
            type: 'leader',
            name: leaderName,
            description: `${leaderName} rules this ${orgType} with ${orgType === 'tower' ? 'dark magic' : orgType === 'horde' ? 'brutal strength' : 'wisdom and justice'}.`,
          });
        }
      }

      significance = `This ${orgType} has been a significant power in the region for ${age} years, influencing the lives of all who live nearby.`;
    }

    return {
      feature,
      history: story,
      provenance: {
        creator,
        createdBy,
        age,
        origin,
      },
      lore: {
        story,
        significance,
        connections,
      },
      inhabitants: inhabitants.length > 0 ? inhabitants : undefined,
      events: events.length > 0 ? events : undefined,
    };
  }

  /**
   * Generate rich content for a dungeon
   */
  generateDungeonContent(dungeon: Dungeon): RichDungeonContent {
    const rng = this.createRNG(`${dungeon.seed}-rich`);
    const ages = [50, 100, 200, 500, 1000];
    const age = ages[Math.floor(rng() * ages.length)];

    const builders = [
      'Ancient Dwarven Kingdom',
      'Dark Necromancer Cult',
      'Forgotten Empire',
      'Ancient Dragons',
      'Lost Civilization',
    ];
    const builder = builders[Math.floor(rng() * builders.length)];

    const purposes = [
      'mining operation',
      'necromantic research',
      'prison for dark creatures',
      'treasure vault',
      'ancient temple',
      'underground fortress',
    ];
    const purpose = purposes[Math.floor(rng() * purposes.length)];

    const history = `This dungeon was built ${age} years ago by the ${builder} as a ${purpose}. Over the centuries, it has been abandoned, conquered, and reclaimed by various forces. The deepest levels hold secrets that have been lost to time, and dark creatures now call it home.`;

    const story = `${dungeon.name} stands as a testament to the ${builder}'s power. Built ${age} years ago, it was once a thriving ${purpose}, but now it is a place of danger and mystery. Those who venture within rarely return, and those who do speak of horrors beyond imagination.`;

    // Generate main boss (at deepest level)
    const mainBoss = this.generateBoss(dungeon.maxDepth, dungeon.seed, 'main', rng);
    
    // Generate mid-bosses (at levels 25, 50, 75)
    const midBosses: RichDungeonContent['midBosses'] = [];
    const midBossLevels = [25, 50, 75].filter(level => level < dungeon.maxDepth);
    midBossLevels.forEach(level => {
      if (rng() < 0.7) { // 70% chance of mid-boss
        midBosses.push(this.generateBoss(level, dungeon.seed, 'mid', rng));
      }
    });

    // Generate notable rooms
    const notableRooms: RichDungeonContent['notableRooms'] = [];
    dungeon.levels.forEach(level => {
      level.rooms.forEach(room => {
        if (room.type === 'treasure_room' || room.type === 'boss_room' || room.type === 'puzzle_room') {
          if (rng() < 0.3) {
            notableRooms.push({
              level: level.z,
              roomName: room.name,
              description: room.description,
            });
          }
        }
      });
    });

    return {
      dungeon,
      history,
      provenance: {
        builder,
        builtBy: builder,
        age,
        purpose,
      },
      lore: {
        story,
        significance: `This dungeon is one of the most dangerous places in the region, its depths holding secrets from an age long past.`,
      },
      mainBoss,
      midBosses: midBosses.length > 0 ? midBosses : undefined,
      notableRooms: notableRooms.length > 0 ? notableRooms : undefined,
    };
  }

  /**
   * Generate a boss
   */
  private generateBoss(
    level: number,
    seed: string,
    type: 'main' | 'mid',
    rng: () => number
  ): RichDungeonContent['mainBoss'] {
    const bossSeed = `${seed}-boss-${level}-${type}`;
    const bossRNG = this.createRNG(bossSeed);

    const bossTypes = type === 'main' 
      ? ['Lich', 'Ancient Dragon', 'Demon Lord', 'Vampire Lord', 'Dark Archmage']
      : ['Orc Warlord', 'Troll Chieftain', 'Dark Knight', 'Necromancer', 'Giant Spider Queen'];

    const bossNames: Record<string, string[]> = {
      'Lich': ['Malachar the Eternal', 'Vex the Undying', 'Zephyr the Deathless'],
      'Ancient Dragon': ['Drakon the Ancient', 'Ignis the Flame-Breath', 'Frostfang the Eternal'],
      'Demon Lord': ['Balrog the Destroyer', 'Mephisto the Corruptor', 'Azazel the Fallen'],
      'Vampire Lord': ['Vlad the Immortal', 'Nosferatu the Ancient', 'Dracula the Blood-Drinker'],
      'Dark Archmage': ['Malachar the Black', 'Vex the Shadow-Weaver', 'Zephyr the Dark'],
      'Orc Warlord': ['Grubnak the Fierce', 'Bloodaxe the Savage', 'Skullcrusher the Brutal'],
      'Troll Chieftain': ['Grok the Massive', 'Boulder the Unstoppable', 'Stonefist the Mighty'],
      'Dark Knight': ['Blackthorn the Fallen', 'Shadowblade the Cursed', 'Ironfist the Damned'],
      'Necromancer': ['Malachar the Dark', 'Vex the Death-Caller', 'Zephyr the Bone-Raiser'],
      'Giant Spider Queen': ['Arachnia the Web-Weaver', 'Venomfang the Poisonous', 'Silkstrand the Trapper'],
    };

    const bossType = bossTypes[Math.floor(bossRNG() * bossTypes.length)];
    const nameList = bossNames[bossType] || [`${bossType} of Level ${level}`];
    const name = nameList[Math.floor(bossRNG() * nameList.length)];

    const powers: string[] = [];
    const powerCount = type === 'main' ? 3 : 2;
    const allPowers = [
      'Dark Magic',
      'Necromancy',
      'Fire Breath',
      'Shadow Manipulation',
      'Mind Control',
      'Regeneration',
      'Summoning',
      'Curses',
    ];
    for (let i = 0; i < powerCount; i++) {
      const power = allPowers[Math.floor(bossRNG() * allPowers.length)];
      if (!powers.includes(power)) {
        powers.push(power);
      }
    }

    const histories: Record<string, string[]> = {
      'Lich': [
        `Once a powerful archmage, ${name} sought immortality through dark magic. After centuries of undeath, they have become a master of necromancy, commanding legions of undead.`,
        `${name} was a scholar who delved too deep into forbidden knowledge. They achieved lichdom ${Math.floor(bossRNG() * 500 + 100)} years ago and have been amassing power ever since.`,
      ],
      'Ancient Dragon': [
        `${name} has slumbered in these depths for over a thousand years. This ancient wyrm is one of the last of its kind, its scales harder than steel and its breath capable of melting stone.`,
        `A legendary dragon from the age of myth, ${name} was sealed away here long ago. The seal has weakened, and the dragon's power grows with each passing year.`,
      ],
      'Demon Lord': [
        `${name} was summoned from the depths of the abyss centuries ago. Though the summoner is long dead, the demon remains, bound to this place and growing in power.`,
        `A fallen angel who embraced darkness, ${name} was banished here long ago. They have corrupted the very stone of the dungeon, turning it into a hellish realm.`,
      ],
    };

    const historyList = histories[bossType] || [
      `${name} has ruled this level of the dungeon for many years, their power growing with each victim they claim.`,
    ];
    const history = historyList[Math.floor(bossRNG() * historyList.length)];

    return {
      name,
      type: bossType,
      level: -Math.abs(level), // Negative for dungeon depth
      description: `${name} is a ${bossType.toLowerCase()} of immense power, commanding this level of the dungeon with ${powers.join(' and ')}.`,
      history,
      powers,
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

