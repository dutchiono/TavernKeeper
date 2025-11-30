import type {
    Lore,
    WorldContentType,
    ContentConnection,
    Provenance,
    WorldContent,
} from '../types/world-content';
import type { HistoricalEvent } from '../types/world-content';

/**
 * Lore Generator
 * 
 * Generates narrative lore and significance for world content elements.
 * Can use templates (deterministic) or AI (dynamic).
 */
export class LoreGenerator {
    /**
     * Generate lore for a world content element
     */
    generateLore(
        content: WorldContent,
        provenance: Provenance,
        connections: ContentConnection[] = []
    ): Lore {
        const story = this.generateStory(content, provenance, connections);
        const significance = this.generateSignificance(content, provenance);
        const culturalContext = this.generateCulturalContext(content, provenance);

        return {
            contentId: content.id,
            story,
            significance,
            connections,
            culturalContext,
            enrichedAt: new Date(),
            version: 1,
        };
    }

    /**
     * Enrich existing lore with new information
     */
    enrichLore(
        existingLore: Lore,
        newEvents: HistoricalEvent[],
        newConnections: ContentConnection[]
    ): Lore {
        // Merge new connections
        const allConnections = [...existingLore.connections, ...newConnections];
        const uniqueConnections = this.deduplicateConnections(allConnections);

        // Update story with new events
        const enrichedStory = this.enrichStory(
            existingLore.story,
            newEvents,
            existingLore.contentId
        );

        return {
            ...existingLore,
            story: enrichedStory,
            connections: uniqueConnections,
            enrichedAt: new Date(),
            version: existingLore.version + 1,
        };
    }

    /**
     * Generate story narrative
     */
    private generateStory(
        content: WorldContent,
        provenance: Provenance,
        connections: ContentConnection[]
    ): string {
        const parts: string[] = [];

        // Origin story
        if (provenance.creatorId) {
            parts.push(
                this.getCreationStory(content.type, provenance.creationMethod, provenance.creatorId)
            );
        } else if (provenance.originId) {
            parts.push(
                this.getOriginStory(content.type, provenance.originId)
            );
        }

        // Age and history
        if (provenance.age !== null) {
            parts.push(
                `This ${content.type} is approximately ${provenance.age} years old.`
            );
        }

        // Historical events
        if (provenance.history.length > 0) {
            const significantEvents = provenance.history.filter(
                (e) => e.type === 'conquest' || e.type === 'destruction' || e.type === 'significant'
            );
            if (significantEvents.length > 0) {
                parts.push(this.formatHistoricalEvents(significantEvents));
            }
        }

        // Connections
        if (connections.length > 0) {
            const connectionText = this.formatConnections(connections);
            if (connectionText) {
                parts.push(connectionText);
            }
        }

        return parts.join(' ') || this.getDefaultStory(content.type);
    }

    /**
     * Generate significance description
     */
    private generateSignificance(
        content: WorldContent,
        provenance: Provenance
    ): string {
        // Determine significance based on type and history
        if (provenance.history.some((e) => e.type === 'conquest' || e.type === 'significant')) {
            return `This ${content.type} has played a significant role in the region's history.`;
        }

        if (provenance.creatorId) {
            return `Created by ${provenance.creatorId}, this ${content.type} represents their craftsmanship and legacy.`;
        }

        return `This ${content.type} is part of the world's ongoing story.`;
    }

    /**
     * Generate cultural context
     */
    private generateCulturalContext(
        content: WorldContent,
        provenance: Provenance
    ): string | undefined {
        if (!provenance.creatorId) return undefined;

        // This would be enriched with civilization data
        return `Associated with ${provenance.creatorId} culture and traditions.`;
    }

    /**
     * Get creation story based on type and method
     */
    private getCreationStory(
        type: WorldContentType,
        method: string,
        creator: string
    ): string {
        const templates: Record<string, Partial<Record<WorldContentType, string>>> = {
            built: {
                dungeon: `Built by ${creator} as a stronghold and place of power.`,
                location: `Established by ${creator} as a settlement.`,
                room: `Constructed by ${creator} as part of a larger structure.`,
                item: '', // Items use 'forged' or 'crafted'
                boss: '', // Bosses don't use 'built'
                creature: '', // Creatures use 'born'
                civilization: '', // Civilizations use 'founded'
                event: '', // Events don't use 'built'
                encounter: '', // Encounters don't use 'built'
                region: '', // Regions are natural
                world: '', // World is primordial
            },
            forged: {
                item: `Forged by ${creator} using ancient techniques.`,
                dungeon: '',
                location: '',
                room: '',
                boss: '',
                creature: '',
                civilization: '',
                event: '',
                encounter: '',
                region: '',
                world: '',
            },
            born: {
                boss: `Born from ${creator}, this entity has grown in power over time.`,
                creature: `Born in the wild, this creature is part of ${creator}'s domain.`,
                item: '',
                dungeon: '',
                location: '',
                room: '',
                civilization: '',
                event: '',
                encounter: '',
                region: '',
                world: '',
            },
            founded: {
                civilization: `${creator} was founded in ancient times.`,
                location: `${creator} was founded as a settlement.`,
                dungeon: '',
                room: '',
                item: '',
                boss: '',
                creature: '',
                event: '',
                encounter: '',
                region: '',
                world: '',
            },
        };

        return templates[method]?.[type] || `${type} created by ${creator} using ${method}.`;
    }

    /**
     * Get origin story
     */
    private getOriginStory(type: WorldContentType, originId: string): string {
        return `This ${type} originated from ${originId}.`;
    }

    /**
     * Format historical events into narrative
     */
    private formatHistoricalEvents(events: HistoricalEvent[]): string {
        if (events.length === 0) return '';

        const eventDescriptions = events.map((e) => {
            const date = e.timestamp.toLocaleDateString();
            return `In ${date}, ${e.description}`;
        });

        return `Throughout its history: ${eventDescriptions.join('. ')}.`;
    }

    /**
     * Format connections into narrative
     */
    private formatConnections(connections: ContentConnection[]): string {
        if (connections.length === 0) return '';

        const connectionTexts = connections
            .filter((c) => c.strength === 'strong' || c.strength === 'moderate')
            .map((c) => c.description);

        if (connectionTexts.length === 0) return '';

        return `It is connected to other elements of the world: ${connectionTexts.join(', ')}.`;
    }

    /**
     * Enrich existing story with new events
     */
    private enrichStory(
        existingStory: string,
        newEvents: HistoricalEvent[],
        contentId: string
    ): string {
        if (newEvents.length === 0) return existingStory;

        const newEventText = this.formatHistoricalEvents(newEvents);
        return `${existingStory} More recently: ${newEventText}`;
    }

    /**
     * Get default story if no specific lore can be generated
     */
    private getDefaultStory(type: WorldContentType): string {
        return `This ${type} exists in the world, its full story yet to be discovered.`;
    }

    /**
     * Deduplicate connections
     */
    private deduplicateConnections(
        connections: ContentConnection[]
    ): ContentConnection[] {
        const seen = new Set<string>();
        return connections.filter((conn) => {
            const key = `${conn.targetId}-${conn.relationship}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
