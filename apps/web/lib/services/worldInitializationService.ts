/**
 * World Initialization Service
 * 
 * Handles one-time world generation on game deploy.
 * Generates world, lore, history, and initial dungeons.
 */

import { supabase } from '../supabase';
import { WorldGenerator } from '../../contributions/world-generation-system/code/generators/world-generator';
import { ThemedDungeonGenerator } from '../../contributions/themed-dungeon-generation/code/index';
import type { ThemedDungeon, DungeonWorldContext } from '../../contributions/themed-dungeon-generation/code/types/dungeon-generation';

const WORLD_SEED = process.env.WORLD_SEED || 'innkeeper-world-v1';

/**
 * Check if world is already initialized
 */
export async function isWorldInitialized(): Promise<boolean> {
  try {
    // Check if we have world content entries
    const { data: worldContent, error: worldError } = await supabase
      .from('world_content')
      .select('id')
      .eq('type', 'world')
      .limit(1);

    if (worldError && worldError.code !== 'PGRST116') {
      console.error('Error checking world initialization:', worldError);
      return false;
    }

    if (worldContent && worldContent.length > 0) {
      return true;
    }

    // Also check if we have dungeons
    const { data: dungeons, error: dungeonError } = await supabase
      .from('dungeons')
      .select('id')
      .limit(1);

    if (dungeonError && dungeonError.code !== 'PGRST116') {
      console.error('Error checking dungeons:', dungeonError);
      return false;
    }

    return (dungeons && dungeons.length > 0) || false;
  } catch (error) {
    console.error('Error checking world initialization:', error);
    return false;
  }
}

/**
 * Initialize the world - generates world content and initial dungeons
 */
export async function initializeWorld(): Promise<void> {
  console.log('🌍 Starting world initialization...');

  // Check if already initialized
  const initialized = await isWorldInitialized();
  if (initialized) {
    console.log('✅ World already initialized, skipping...');
    return;
  }

  try {
    // Step 1: Generate world using WorldGenerator
    console.log('📦 Generating world content...');
    const worldGenerator = new WorldGenerator();
    const generatedWorld = await worldGenerator.generateWorld({
      seed: WORLD_SEED,
      includeLevels: [1, 2, 2.5, 3, 4, 5, 6, 6.5, 7.5], // All levels including dungeons
      depth: 'full',
    });

    console.log(`✅ Generated world with ${generatedWorld.dungeons.length} dungeons`);

    // Step 2: Store world content in database
    // For now, we'll store the world content structure
    // The world-content-hierarchy system will handle detailed storage
    // We'll create a root world entry
    const worldContentId = `world-${WORLD_SEED}`;
    const { error: worldContentError } = await supabase
      .from('world_content')
      .upsert({
        id: worldContentId,
        type: 'world',
        name: 'TavernKeeper World',
        description: 'The world of TavernKeeper, generated from cosmic forces down to individual mortals.',
        parent_id: null,
        created_at: new Date().toISOString(),
        discovered_at: new Date().toISOString(),
        metadata: {
          seed: WORLD_SEED,
          primordials: generatedWorld.primordials.length,
          cosmicCreators: generatedWorld.cosmicCreators.length,
          geography: generatedWorld.geography.length,
          conceptualBeings: generatedWorld.conceptualBeings.length,
          demiGods: generatedWorld.demiGods.length,
          mortalRaces: generatedWorld.mortalRaces.length,
          organizations: generatedWorld.organizations.length,
          standoutMortals: generatedWorld.standoutMortals.length,
          dungeons: generatedWorld.dungeons.length,
        },
      }, {
        onConflict: 'id',
      });

    if (worldContentError) {
      console.error('Error storing world content:', worldContentError);
      throw worldContentError;
    }

    // Step 3: Generate themed dungeons from world dungeons
    console.log('🏰 Generating themed dungeons...');
    const themedDungeonGenerator = new ThemedDungeonGenerator();
    const dungeonPromises = generatedWorld.dungeons.map(async (worldDungeon) => {
      // Create world context for dungeon generation
      const worldContext: DungeonWorldContext = {
        locationId: worldDungeon.locationId,
        standoutMortals: generatedWorld.standoutMortals
          .filter(m => m.isBoss && m.location === worldDungeon.locationId)
          .map(m => ({
            id: m.id,
            name: m.name,
            standoutType: m.standoutType,
            location: m.location,
            race: m.race,
            organization: m.organization,
            powers: m.powers,
            level: m.level,
            age: m.age,
            alignment: m.alignment,
            isBoss: m.isBoss,
            parentId: m.parentId,
            createdAt: m.createdAt,
            description: m.description,
            metadata: m.metadata,
          })),
        demiGods: generatedWorld.demiGods
          .filter(d => d.isBoss && d.alignment === 'evil')
          .map(d => ({
            id: d.id,
            name: d.name,
            demiGodType: d.demiGodType,
            origin: d.origin,
            powers: d.powers,
            age: d.age,
            alignment: d.alignment,
            isBoss: d.isBoss,
            parentId: d.parentId,
            createdAt: d.createdAt,
            description: d.description,
            metadata: d.metadata,
            halfGodRace: d.halfGodRace,
            ancientCreatureType: d.ancientCreatureType,
            divineExperimentFeatures: d.divineExperimentFeatures,
            fallenDivineType: d.fallenDivineType,
            primordialSpawnType: d.primordialSpawnType,
          })),
        worldEvents: generatedWorld.worldEvents || [],
      };

      // Generate themed dungeon
      const dungeonSeed = worldDungeon.seed || `${WORLD_SEED}-dungeon-${worldDungeon.id}`;
      const themedDungeon = await themedDungeonGenerator.generate({
        seed: dungeonSeed,
        depth: worldDungeon.depth || 100,
        worldContext,
        worldContentId: worldDungeon.id,
      });

      // Store dungeon in database
      const { error: dungeonError } = await supabase
        .from('dungeons')
        .upsert({
          seed: dungeonSeed,
          map: {
            id: themedDungeon.id,
            name: themedDungeon.name,
            depth: themedDungeon.depth,
            theme: themedDungeon.theme,
            finalBoss: themedDungeon.finalBoss,
            midBosses: themedDungeon.midBosses,
            levelLayout: themedDungeon.levelLayout,
            provenance: themedDungeon.provenance,
          },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'seed',
        });

      if (dungeonError) {
        console.error(`Error storing dungeon ${dungeonSeed}:`, dungeonError);
        throw dungeonError;
      }

      return themedDungeon;
    });

    const themedDungeons = await Promise.all(dungeonPromises);
    console.log(`✅ Generated and stored ${themedDungeons.length} themed dungeons`);

    console.log('✅ World initialization complete!');
  } catch (error) {
    console.error('❌ Error initializing world:', error);
    throw error;
  }
}

/**
 * Initialize world on startup if not already initialized
 * This should be called from workers/index.ts
 */
export async function initializeWorldOnStartup(): Promise<void> {
  try {
    await initializeWorld();
  } catch (error) {
    console.error('Failed to initialize world on startup:', error);
    // Don't throw - allow workers to start even if world init fails
    // World can be initialized manually via API endpoint
  }
}

