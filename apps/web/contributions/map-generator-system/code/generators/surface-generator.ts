/**
 * Surface Generator
 * 
 * Generates surface features for map cells.
 * Integrates with world-generation-system for Geography and Organizations.
 */

import type {
  MapCell,
  MapFeature,
  CellGenerationContext,
  FeatureType,
  FeatureSource,
} from '../types/map-generation';

export class SurfaceGenerator {
  /**
   * Generate a cell with surface features
   */
  async generateCell(
    context: CellGenerationContext,
    density: 'sparse' | 'normal' | 'dense' = 'normal'
  ): Promise<MapCell> {
    const { seed, x, y } = context;
    const features: MapFeature[] = [];

    // Generate features based on seed and coordinates
    // This is a simplified version - in practice, would integrate with
    // world-generation-system to get Geography and Organizations

    // Determine feature density
    const densityMultiplier = {
      sparse: 0.5,
      normal: 1.0,
      dense: 1.5,
    }[density];

    // Generate geographical features (if world generator available)
    if (context.worldGenerator) {
      const geoFeatures = await this.generateGeographyFeatures(
        context,
        densityMultiplier
      );
      features.push(...geoFeatures);
    }

    // Generate organizational features (if world generator available)
    if (context.worldGenerator) {
      const orgFeatures = await this.generateOrganizationFeatures(
        context,
        densityMultiplier
      );
      features.push(...orgFeatures);
    }

    // Generate additional features (landmarks, etc.)
    const additionalFeatures = this.generateAdditionalFeatures(
      context,
      densityMultiplier
    );
    features.push(...additionalFeatures);

    // Create cell
    const cell: MapCell = {
      id: `cell-${x}-${y}`,
      x,
      y,
      seed,
      features,
      dungeonEntrances: [],
      discoveredAt: new Date(),
      worldContentId: undefined,
      metadata: {
        density,
        generatedAt: new Date().toISOString(),
      },
    };

    return cell;
  }

  /**
   * Generate geography features using world-generation-system
   */
  private async generateGeographyFeatures(
    context: CellGenerationContext,
    densityMultiplier: number
  ): Promise<MapFeature[]> {
    const features: MapFeature[] = [];
    
    // In practice, this would:
    // 1. Query world-generation-system for Geography at this location
    // 2. Convert Geography entries to MapFeatures
    // 3. Place them in the cell

    // For now, generate placeholder features based on seed
    const rng = this.createRNG(context.seed);
    const hasGeography = rng() < 0.3 * densityMultiplier;

    if (hasGeography) {
      const geoTypes: Array<{ type: string; name: string }> = [
        { type: 'forest', name: 'Ancient Forest' },
        { type: 'mountain', name: 'Mountain Range' },
        { type: 'river', name: 'Flowing River' },
        { type: 'plains', name: 'Vast Plains' },
      ];

      const selected = geoTypes[Math.floor(rng() * geoTypes.length)];

      features.push({
        id: `feature-geo-${context.x}-${context.y}`,
        type: 'geography' as FeatureType,
        name: selected.name,
        description: `A ${selected.type} feature in this area`,
        source: 'geography' as FeatureSource,
        worldContentId: undefined,
        metadata: {
          geographyType: selected.type,
        },
      });
    }

    return features;
  }

  /**
   * Generate organization features using world-generation-system
   */
  private async generateOrganizationFeatures(
    context: CellGenerationContext,
    densityMultiplier: number
  ): Promise<MapFeature[]> {
    const features: MapFeature[] = [];

    // In practice, this would:
    // 1. Query world-generation-system for Organizations at this location
    // 2. Convert Organization entries to MapFeatures
    // 3. Place them in the cell

    // For now, generate placeholder features based on seed
    const rng = this.createRNG(`${context.seed}-org`);
    const hasOrganization = rng() < 0.2 * densityMultiplier;

    if (hasOrganization) {
      const orgTypes: Array<{ type: string; name: string }> = [
        { type: 'kingdom', name: 'Kingdom Settlement' },
        { type: 'tower', name: 'Necromancer Tower' },
        { type: 'horde', name: 'Orc Horde Camp' },
        { type: 'town', name: 'Small Town' },
        { type: 'graveyard', name: 'Ancient Graveyard' },
      ];

      const selected = orgTypes[Math.floor(rng() * orgTypes.length)];

      features.push({
        id: `feature-org-${context.x}-${context.y}`,
        type: 'organization' as FeatureType,
        name: selected.name,
        description: `A ${selected.type} located here`,
        source: 'organization' as FeatureSource,
        worldContentId: undefined,
        metadata: {
          organizationType: selected.type,
        },
      });
    }

    return features;
  }

  /**
   * Generate additional features (landmarks, ruins, etc.)
   */
  private generateAdditionalFeatures(
    context: CellGenerationContext,
    densityMultiplier: number
  ): MapFeature[] {
    const features: MapFeature[] = [];
    const rng = this.createRNG(`${context.seed}-additional`);

    // Landmarks
    if (rng() < 0.1 * densityMultiplier) {
      features.push({
        id: `feature-landmark-${context.x}-${context.y}`,
        type: 'landmark' as FeatureType,
        name: 'Ancient Landmark',
        description: 'A mysterious landmark of unknown origin',
        source: 'landmark' as FeatureSource,
        worldContentId: undefined,
        metadata: {},
      });
    }

    // Ruins
    if (rng() < 0.15 * densityMultiplier) {
      features.push({
        id: `feature-ruin-${context.x}-${context.y}`,
        type: 'ruin' as FeatureType,
        name: 'Abandoned Ruins',
        description: 'The remains of an ancient structure',
        source: 'generated' as FeatureSource,
        worldContentId: undefined,
        metadata: {},
      });
    }

    // Trading posts
    if (rng() < 0.05 * densityMultiplier) {
      features.push({
        id: `feature-trading-${context.x}-${context.y}`,
        type: 'trading_post' as FeatureType,
        name: 'Trading Post',
        description: 'A small trading outpost',
        source: 'generated' as FeatureSource,
        worldContentId: undefined,
        metadata: {},
      });
    }

    return features;
  }

  /**
   * Create a simple RNG from a seed string
   */
  private createRNG(seed: string): () => number {
    let hash = this.hashString(seed);
    return () => {
      hash = ((hash * 9301) + 49297) % 233280;
      return hash / 233280;
    };
  }

  /**
   * Simple string hash function
   */
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

