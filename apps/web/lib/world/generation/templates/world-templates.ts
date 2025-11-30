/**
 * World Generation Templates
 * 
 * Templates for generating names, descriptions, and relationships
 * for each level of world generation.
 */

import type {
    PrimordialType,
    CosmicElement,
    GeographyType,
    ConceptualType,
    DemiGodType,
    MortalRaceType,
    OrganizationMagnitude,
    StandoutType,
    RoleType,
} from '../types/world-generation';

/**
 * Name templates for each type
 */
export const NameTemplates = {
    primordial: {
        space: ['The Void', 'The Abyss', 'The Emptiness', 'The Expanse'],
        time: ['The Eternal', 'The Timeless', 'The Chronos', 'The Flow'],
        light: ['The Radiance', 'The Illumination', 'The Brilliance', 'The Dawn'],
        dark: ['The Shadow', 'The Darkness', 'The Night', 'The Void'],
        order: ['The Balance', 'The Structure', 'The Law', 'The Pattern'],
        chaos: ['The Chaos', 'The Entropy', 'The Disorder', 'The Wild'],
        void: ['The Nothing', 'The Emptiness', 'The Void', 'The Absence'],
        eternity: ['The Infinite', 'The Eternal', 'The Forever', 'The Endless'],
    },

    cosmic: {
        rock: ['The Stone Shaper', 'The Mountain Forger', 'The Earth Molder', 'The Granite One'],
        wind: ['The Wind Rider', 'The Sky Dancer', 'The Breeze Caller', 'The Storm Bringer'],
        water: ['The Deep One', 'The Tide Master', 'The Flow Keeper', 'The Wave Singer'],
        life: ['The Life Giver', 'The Growth Bringer', 'The Seed Planter', 'The Bloom Creator'],
        fire: ['The Flame Keeper', 'The Ember Lord', 'The Blaze Forger', 'The Inferno'],
        earth: ['The Ground Shaker', 'The Soil Tender', 'The Land Keeper', 'The Terra'],
        air: ['The Sky Lord', 'The Cloud Rider', 'The Breath Giver', 'The Zephyr'],
        ice: ['The Frost Bringer', 'The Ice Shaper', 'The Cold One', 'The Glacier'],
        lightning: ['The Thunder Caller', 'The Bolt Forger', 'The Spark', 'The Storm'],
        shadow: ['The Shadow Weaver', 'The Dark Shaper', 'The Umbra', 'The Shade'],
    },

    geography: {
        continent: ['The Northern Wastes', 'The Eastern Lands', 'The Western Reaches', 'The Southern Expanse'],
        ocean: ['The Endless Sea', 'The Deep Blue', 'The Vast Waters', 'The Great Ocean'],
        mountain_range: ["The Dragon's Spine", "The Titan's Back", 'The Sky Peaks', 'The Cloud Mountains'],
        river: ['The Flowing Path', 'The Silver Stream', 'The Life River', 'The Ancient Flow'],
        underground_system: ['The Deep Tunnels', 'The Underdark', 'The Caverns Below', 'The Subterranean'],
        forest: ['The Ancient Woods', 'The Whispering Trees', 'The Green Expanse', 'The Wild Forest'],
        desert: ['The Endless Sands', 'The Burning Waste', 'The Dry Expanse', 'The Scorched Land'],
        plains: ['The Rolling Fields', 'The Open Grass', 'The Wide Expanse', 'The Flatlands'],
        island: ['The Lonely Isle', 'The Hidden Land', 'The Isolated Rock', 'The Secluded Place'],
        volcano: ['The Fire Mountain', 'The Molten Peak', 'The Burning Summit', 'The Lava Forge'],
        cave_system: ['The Dark Caves', 'The Echoing Caverns', 'The Hidden Depths', 'The Stone Labyrinth'],
    },

    conceptual: {
        luck: ['Lady Fortune', 'The Fortunate One', 'The Chance Bringer', 'The Lucky'],
        love: ["The Heart's Desire", 'The Love Bringer', 'The Passion', 'The Beloved'],
        fertility: ['The Harvest Mother', 'The Growth Keeper', 'The Fertile One', 'The Bountiful'],
        justice: ['The Just One', 'The Balance Keeper', 'The Law Giver', 'The Fair'],
        war: ['The War Bringer', 'The Battle Lord', 'The Conflict', 'The Warrior'],
        death: ['The Reaper', 'The End Bringer', 'The Final One', 'The Death Keeper'],
        wisdom: ['The Wise One', 'The Knowledge Keeper', 'The Sage', 'The Learned'],
        wealth: ['The Gold Keeper', 'The Treasure Lord', 'The Wealthy', 'The Rich'],
        art: ['The Artisan', 'The Creator', 'The Beauty Bringer', 'The Artist'],
        music: ['The Song Keeper', 'The Melody', 'The Harmony', 'The Singer'],
        craft: ['The Maker', 'The Crafter', 'The Builder', 'The Artisan'],
        hunting: ['The Hunter', 'The Stalker', 'The Pursuer', 'The Tracker'],
        harvest: ['The Reaper', 'The Gatherer', 'The Harvester', 'The Collector'],
    },

    demigod: {
        half_god: ['The Divine Child', 'The Half-Born', 'The Divine Mortal', 'The God-Touched'],
        ancient_creature: ['The First One', 'The Ancient', 'The Oldest', 'The Primeval'],
        divine_experiment: ['The Created', 'The Experiment', 'The Forged', 'The Made'],
        fallen_divine: ['The Fallen', 'The Cast Out', 'The Banished', 'The Exiled'],
        ascended_mortal: ['The Ascended', 'The Risen', 'The Elevated', 'The Transcended'],
        primordial_spawn: ['The Spawn', 'The Offspring', 'The Child', 'The Descendant'],
    },

    organization: {
        empire: ['The Great Empire', 'The Vast Dominion', 'The Grand Realm', 'The Mighty Empire'],
        kingdom: ['The Kingdom of', 'The Realm of', 'The Domain of', 'The Land of'],
        horde: ['The Red Horde', 'The War Horde', 'The Battle Horde', 'The Fierce Horde'],
        realm: ['The Elven Realm', 'The Fey Realm', 'The Mystic Realm', 'The Enchanted Realm'],
        city: ['The City of', 'The Great City of', 'The Fortress of', 'The Metropolis of'],
        town: ['The Town of', 'The Settlement of', 'The Village of', 'The Hamlet of'],
        tribe: ['The Tribe of', 'The Clan of', 'The People of', 'The Folk of'],
        guild: ["The Mage's Guild", "The Thieves' Guild", "The Warriors' Guild", "The Merchants' Guild"],
        band: ['The Band of', 'The Company of', 'The Group of', 'The Crew of'],
        clan: ['The Clan of', 'The House of', 'The Family of', 'The Line of'],
        circle: ['The Circle of', 'The Order of', 'The Fellowship of', 'The Brotherhood of'],
        company: ['The Company of', 'The Band of', 'The Group of', 'The Crew of'],
    },

    standout: {
        hero: ['The Brave', 'The Valiant', 'The Hero', 'The Champion'],
        villain: ['The Dark One', 'The Evil', 'The Malicious', 'The Wicked'],
        wizard: ['Archmage', 'Grand Wizard', 'Master Mage', 'The Sorcerer'],
        king: ['King', 'The King', 'The Ruler', 'The Monarch'],
        war_chief: ['War Chief', 'The Warlord', 'The Battle Leader', 'The Commander'],
        vampire: ['The Vampire', 'The Blood Drinker', 'The Night Walker', 'The Immortal'],
        lich: ['The Lich', 'The Undead Lord', 'The Death Keeper', 'The Necromancer'],
        dragon_lord: ['Dragon Lord', 'The Wyrm', 'The Great Dragon', 'The Dragon King'],
        dungeon_boss: ['The Guardian', 'The Keeper', 'The Warden', 'The Protector'],
        archmage: ['Archmage', 'The Archmage', 'Master of Magic', 'The Supreme Mage'],
        high_priest: ['High Priest', 'The High Priest', 'The Cleric', 'The Divine'],
        master_thief: ['Master Thief', 'The Shadow', 'The Rogue', 'The Stealth'],
        legendary_warrior: ['The Legend', 'The Warrior', 'The Champion', 'The Hero'],
    },

    role: {
        blacksmith: ['Blacksmith', 'Forge Master', 'Metal Worker', 'Smith'],
        playwright: ['Playwright', 'Bard', 'Storyteller', 'Dramatist'],
        assassin: ['Assassin', 'Shadow', 'Killer', 'Blade'],
        princess: ['Princess', 'Lady', 'Noble', 'Royal'],
        merchant: ['Merchant', 'Trader', 'Trader', 'Vendor'],
        farmer: ['Farmer', 'Cultivator', 'Grower', 'Tiller'],
        soldier: ['Soldier', 'Warrior', 'Fighter', 'Guard'],
        scholar: ['Scholar', 'Sage', 'Learned One', 'Academic'],
        priest: ['Priest', 'Cleric', 'Divine', 'Holy One'],
        noble: ['Noble', 'Lord', 'Lady', 'Aristocrat'],
        commoner: ['Commoner', 'Citizen', 'Person', 'Individual'],
        artisan: ['Artisan', 'Craftsman', 'Maker', 'Creator'],
        bard: ['Bard', 'Minstrel', 'Singer', 'Poet'],
        ranger: ['Ranger', 'Scout', 'Tracker', 'Hunter'],
        knight: ['Knight', 'Warrior', 'Champion', 'Paladin'],
    },
};

/**
 * Description templates
 */
export function getPrimordialDescription(type: PrimordialType, name: string): string {
    const descriptions: Record<PrimordialType, string> = {
        space: `${name} is the fundamental force of space itself, the emptiness between all things and the container of existence.`,
        time: `${name} is the eternal flow of time, the progression of moments from past to future.`,
        light: `${name} is the radiance that illuminates all, the source of vision and clarity.`,
        dark: `${name} is the shadow that conceals, the absence of light and the unknown.`,
        order: `${name} is the structure and pattern that brings stability to chaos.`,
        chaos: `${name} is the entropy and disorder that breaks down all structure.`,
        void: `${name} is the nothingness, the absence of all things.`,
        eternity: `${name} is the infinite, the endless, the timeless.`,
    };
    return descriptions[type] || `${name} is a primordial force of the universe.`;
}

export function getCosmicDescription(element: CosmicElement, name: string, createdBy: string): string {
    const descriptions: Record<CosmicElement, string> = {
        rock: `${name} shaped the mountains and stones of the world, forging the very foundation of the land.`,
        wind: `${name} breathed life into the skies, creating the winds and storms that move across the world.`,
        water: `${name} filled the oceans and rivers, bringing the flow of life to all corners of the world.`,
        life: `${name} seeded the world with living things, bringing forth all mortal races and creatures.`,
        fire: `${name} kindled the flames of creation, bringing warmth and light to the world.`,
        earth: `${name} molded the soil and ground, creating the fertile earth that sustains life.`,
        air: `${name} filled the atmosphere, bringing breath and movement to all living things.`,
        ice: `${name} shaped the frozen lands, creating glaciers and tundras in the coldest regions.`,
        lightning: `${name} forged the storms, bringing the power of the sky to the world.`,
        shadow: `${name} wove the darkness, creating the shadows and mysteries of the world.`,
    };
    return descriptions[element] || `${name} is a cosmic creator of ${element}.`;
}

export function getGeographyDescription(
    geographyType: GeographyType,
    name: string,
    createdBy: string
): string {
    const base = `${name} is a ${geographyType.replace('_', ' ')}`;
    return `${base}, shaped by the cosmic forces that created the world.`;
}

/**
 * Generate a name from templates using seed
 */
export function generateName(
    templates: string[],
    seed: string,
    index: number = 0
): string {
    // Simple seeded selection
    const hash = simpleHash(`${seed}-${index}`);
    return templates[hash % templates.length];
}

/**
 * Simple hash function for deterministic selection
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}
