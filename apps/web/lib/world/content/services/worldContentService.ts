import type {
    WorldContentEntry,
    WorldContentQuery,
    ProvenanceChain,
    Lore,
    ContentConnection,
    WorldContent,
    Provenance,
    WorldContentType,
} from '../types/world-content';
import { WorldManager } from '../world-content/world-manager';
import { supabase } from '../../../supabase';

/**
 * World Content Service
 * 
 * Service layer for querying and managing world content.
 * Integrates with database for persistence.
 */
export class WorldContentService {
    private worldManager: WorldManager;

    constructor() {
        this.worldManager = new WorldManager();
    }

    /**
     * Query world content
     * This would integrate with database in production
     */
    async queryContent(query: WorldContentQuery): Promise<WorldContentEntry[]> {
        let builder = supabase.from('world_content').select('*');

        if (query.type && query.type.length > 0) {
            // TODO: Support IN query for types if needed, or loop
            // For now assuming single type or handled elsewhere
        }
        if (query.limit) {
            builder = builder.limit(query.limit);
        }

        const { data, error } = await builder;
        if (error) throw new Error(error.message);

        // This is a simplified query, full implementation would join provenance/lore
        // For now returning partial data or fetching full data for each
        const entries: WorldContentEntry[] = [];
        if (Array.isArray(data)) {
            for (const item of data) {
                const fullEntry = await this.getContent(item.id);
                if (fullEntry) entries.push(fullEntry);
            }
        }
        return entries;
    }

    /**
     * Get world content entry by ID
     */
    async getContent(id: string): Promise<WorldContentEntry | null> {
        const { data: content, error: contentError } = await supabase
            .from('world_content')
            .select('*')
            .eq('id', id)
            .single();

        if (contentError || !content) return null;

        const { data: provenance } = await supabase
            .from('provenance')
            .select('*')
            .eq('content_id', id)
            .single();

        const { data: lore } = await supabase
            .from('lore')
            .select('*')
            .eq('content_id', id)
            .single();

        return {
            content: content as WorldContent,
            provenance: provenance as Provenance,
            lore: lore as Lore,
        };
    }

    /**
     * Get lore for content
     */
    async getLore(contentId: string): Promise<Lore | null> {
        return this.worldManager.getLore(contentId, async (id) => {
            return this.getContent(id);
        });
    }

    /**
     * Get provenance chain
     */
    async getProvenanceChain(contentId: string): Promise<ProvenanceChain> {
        const chain = await this.worldManager.getProvenanceChain(
            contentId,
            async (id) => {
                const entry = await this.getContent(id);
                if (!entry) return null;
                return {
                    id: entry.content.id,
                    name: entry.content.name,
                    type: entry.content.type,
                    parentId: entry.content.parentId,
                };
            }
        );

        return {
            contentId,
            chain: chain.map(c => ({
                contentId: c.id,
                name: c.name,
                type: c.type as WorldContentType,
                relationship: c.relationship
            })),
        };
    }

    /**
     * Create dungeon content
     */
    async createDungeonContent(
        data: {
            dungeonId: string;
            dungeonSeed: string;
            name: string;
            location?: string;
            clearedBy?: string[];
            clearedAt?: Date;
            discoveredItems?: string[];
            defeatedBosses?: string[];
            rooms?: number;
            depth?: number;
        }
    ): Promise<WorldContentEntry> {
        return this.worldManager.createDungeonContent(
            data,
            async (locationName) => {
                // TODO: Query or create location
                if (!locationName) return null;
                // return await this.getOrCreateLocation(locationName);
                return null;
            },
            async (seed) => {
                // TODO: Get or create civilization from seed
                // return await this.getOrCreateCivilization(seed);
                return null;
            }
        );
    }

    /**
     * Create item content
     */
    async createItemContent(
        data: {
            itemId: string;
            itemSeed: string;
            name: string;
            type: string;
            rarity: string;
            foundIn?: string;
            foundBy?: string[];
            foundAt?: Date;
            material?: string;
            previousOwners?: string[];
        }
    ): Promise<WorldContentEntry> {
        return this.worldManager.createItemContent(
            data,
            async (dungeonId) => {
                if (!dungeonId) return null;
                const entry = await this.getContent(dungeonId);
                if (!entry) return null;
                return {
                    id: entry.content.id,
                    name: entry.content.name,
                    creatorId: entry.provenance.creatorId,
                };
            },
            async (seed) => {
                // TODO: Get or create civilization
                return null;
            }
        );
    }

    /**
     * Create boss content
     */
    async createBossContent(
        data: {
            bossId: string;
            bossSeed: string;
            name: string;
            type: string;
            location?: string;
            defeatedBy?: string[];
            defeatedAt?: Date;
            relatedLocations?: string[];
            relatedItems?: string[];
        }
    ): Promise<WorldContentEntry> {
        return this.worldManager.createBossContent(
            data,
            async (dungeonId) => {
                if (!dungeonId) return null;
                const entry = await this.getContent(dungeonId);
                if (!entry) return null;
                return {
                    id: entry.content.id,
                    name: entry.content.name,
                    creatorId: entry.provenance.creatorId,
                };
            }
        );
    }

    /**
     * Save world content entry to database
     */
    async saveContent(entry: WorldContentEntry): Promise<void> {
        const { error: contentError } = await supabase
            .from('world_content')
            .upsert(entry.content);

        if (contentError) throw new Error(contentError.message);

        if (entry.provenance) {
            await supabase.from('provenance').upsert({ ...entry.provenance, content_id: entry.content.id });
        }

        if (entry.lore) {
            await supabase.from('lore').upsert({ ...entry.lore, content_id: entry.content.id });
        }
    }

    /**
     * Update lore with new information
     */
    async enrichContentLore(
        contentId: string,
        newEvents: Array<{
            timestamp: Date;
            type: 'creation' | 'discovery' | 'conquest' | 'destruction' | 'modification' | 'transfer' | 'significant';
            description: string;
            actors: string[];
            relatedContentIds: string[];
        }>,
        newConnections: Array<{
            targetId: string;
            relationship: string;
            strength: 'weak' | 'moderate' | 'strong';
            description: string;
        }>
    ): Promise<Lore | null> {
        return this.worldManager.enrichLore(
            contentId,
            async (id) => this.getContent(id),
            newEvents,
            newConnections as ContentConnection[]
        );
    }

    /**
     * Get related content (follows connections)
     */
    async getRelatedContent(
        contentId: string,
        relationshipTypes?: string[]
    ): Promise<WorldContentEntry[]> {
        const entry = await this.getContent(contentId);
        if (!entry) return [];

        const connections = relationshipTypes
            ? entry.lore.connections.filter((c) => relationshipTypes.includes(c.relationship))
            : entry.lore.connections;

        const related: WorldContentEntry[] = [];
        for (const connection of connections) {
            const relatedEntry = await this.getContent(connection.targetId);
            if (relatedEntry) {
                related.push(relatedEntry);
            }
        }

        return related;
    }
}
