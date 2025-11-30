/**
 * Geography Generator
 * 
 * Generates Level 2.5: Geography
 * Physical features of the world
 */

import type {
    Geography,
    GeographyType,
    GenerationContext,
} from '../types/world-generation';
import { NameTemplates, getGeographyDescription, generateName } from '../templates/world-templates';

export class GeographyGenerator {
    /**
     * Generate geography
     */
    async generate(
        context: GenerationContext,
        density: 'sparse' | 'normal' | 'dense' = 'normal'
    ): Promise<Geography[]> {
        if (context.cosmicCreators.length === 0) {
            throw new Error('Cosmic creators must be generated before geography');
        }

        const densityMap = {
            sparse: 0.5,
            normal: 1.0,
            dense: 1.5,
        };

        const multiplier = densityMap[density];

        const geographyTypes: Array<{ type: GeographyType; count: number }> = [
            { type: 'continent', count: Math.ceil(3 * multiplier) },
            { type: 'ocean', count: Math.ceil(2 * multiplier) },
            { type: 'mountain_range', count: Math.ceil(5 * multiplier) },
            { type: 'river', count: Math.ceil(8 * multiplier) },
            { type: 'forest', count: Math.ceil(6 * multiplier) },
            { type: 'desert', count: Math.ceil(2 * multiplier) },
            { type: 'underground_system', count: Math.ceil(3 * multiplier) },
        ];

        const geography: Geography[] = [];
        let index = 0;

        geographyTypes.forEach(({ type, count }) => {
            for (let i = 0; i < count; i++) {
                // Assign to a cosmic creator (deterministic)
                const creatorIndex = index % context.cosmicCreators.length;
                const createdBy = context.cosmicCreators[creatorIndex].id;

                const name = generateName(
                    NameTemplates.geography[type],
                    context.seed,
                    index
                );

                const geo: Geography = {
                    id: `geo-${type}-${index}`,
                    type: 'geography',
                    geographyType: type,
                    name,
                    description: getGeographyDescription(type, name, createdBy),
                    parentId: createdBy,
                    createdAt: new Date(2000), // After cosmic creators
                    discoveredAt: new Date(),
                    createdBy,
                    magnitude: this.getMagnitude(type),
                    location: this.generateLocation(context.rng, index),
                    metadata: {
                        seed: context.seed,
                        index,
                        geographyType: type,
                    },
                };

                geography.push(geo);
                index++;
            }
        });

        return geography;
    }

    /**
     * Get magnitude for geography type
     */
    private getMagnitude(type: GeographyType): 'vast' | 'large' | 'medium' | 'small' {
        const magnitudes: Record<GeographyType, 'vast' | 'large' | 'medium' | 'small'> = {
            continent: 'vast',
            ocean: 'vast',
            mountain_range: 'large',
            river: 'medium',
            underground_system: 'large',
            forest: 'large',
            desert: 'large',
            plains: 'medium',
            island: 'small',
            volcano: 'small',
            cave_system: 'medium',
        };
        return magnitudes[type] || 'medium';
    }

    /**
     * Generate location coordinates
     */
    private generateLocation(rng: () => number, index: number): { x: number; y: number } {
        return {
            x: Math.floor(rng() * 1000),
            y: Math.floor(rng() * 1000),
        };
    }
}
