'use server';

import { getAllDocs, getDocBySlug, type Doc } from '../docs';

/**
 * Search docs for relevant content based on context
 */
export async function searchDocs(context: string): Promise<Doc[]> {
    try {
        const allDocSlugs = getAllDocs();
        const docs: Doc[] = [];

        // Load all docs
        for (const slug of allDocSlugs) {
            const doc = await getDocBySlug(slug);
            if (doc) {
                docs.push(doc);
            }
        }

        // Simple keyword matching for now
        // In production, could use vector search or more sophisticated matching
        const contextLower = context.toLowerCase();
        const relevantDocs = docs.filter((doc: Doc) => {
            const content = (doc.content + ' ' + doc.title).toLowerCase();
            return content.includes(contextLower) ||
                   contextLower.split(' ').some(word => content.includes(word));
        });

        // Return top 5 most relevant
        return relevantDocs.slice(0, 5);
    } catch (error) {
        console.error('Error searching docs:', error);
        return [];
    }
}

/**
 * Get docs relevant to a specific game view/page
 */
export async function getContextualDocs(view: string): Promise<Doc[]> {
    const viewContextMap: Record<string, string[]> = {
        'INN': ['getting-started', 'overview', 'heroes'],
        'CELLAR': ['the-cellar', 'contracts/the-cellar'],
        'MAP': ['world-generation', 'dungeon-runs'],
        'BATTLE': ['combat', 'parties'],
        'CHAT': ['ai-agents', 'overview'],
        'PARTY': ['parties', 'first-party'],
        'REGULARS': ['tavern-regulars', 'groups'],
        'POSSE': ['town-posse', 'groups'],
    };

    const keywords = viewContextMap[view] || ['overview'];
    const allDocSlugs = getAllDocs();
    const relevantDocs: Doc[] = [];

    for (const slug of allDocSlugs) {
        const slugStr = slug.join('/');
        if (keywords.some(keyword => slugStr.includes(keyword))) {
            const doc = await getDocBySlug(slug);
            if (doc) {
                relevantDocs.push(doc);
            }
        }
    }

    return relevantDocs;
}

/**
 * Get all docs content as a single string for AI context
 */
export async function getAllDocsContent(): Promise<string> {
    try {
        const allDocSlugs = getAllDocs();
        const docs: Doc[] = [];

        for (const slug of allDocSlugs) {
            const doc = await getDocBySlug(slug);
            if (doc) {
                docs.push(doc);
            }
        }

        // Combine all docs into a single context string
        return docs.map(doc => `# ${doc.title}\n\n${doc.content}`).join('\n\n---\n\n');
    } catch (error) {
        console.error('Error loading all docs:', error);
        return '';
    }
}
