# RAG Integration Guide

**Purpose:** Implement Retrieval-Augmented Generation (RAG) to connect the Discord bot with game documentation dynamically.

## Overview

Currently, the Discord bot's knowledge base is hardcoded in `packages/discord-bot/src/services/concierge.ts` (lines 31-115). This guide explains how to replace it with a RAG system that loads documentation from `docs/game/` and provides semantic search capabilities.

## Architecture

### Current State
- **Location**: `packages/discord-bot/src/services/concierge.ts`
- **Method**: `buildKnowledgeBase()` returns hardcoded string
- **Issue**: Static, can't update without code changes
- **Size**: ~85 lines of hardcoded text

### Target State
- **Location**: `packages/discord-bot/src/services/rag-service.ts` (new file)
- **Method**: Loads `.md` files from `docs/game/`, creates embeddings, performs semantic search
- **Benefits**: Dynamic updates, better context retrieval, scalable

## Implementation Approach

### Option A: Simple File-Based RAG (Recommended for Start)

**Pros:**
- Simple to implement
- No external dependencies (beyond OpenAI for embeddings)
- Easy to debug
- Good for small-medium doc sets (<1000 chunks)

**Cons:**
- Embeddings stored in memory/JSON (not persistent across restarts)
- Slower for very large doc sets
- Manual embedding regeneration when docs change

**When to Use:** Start here. Migrate to Option B if you have >1000 chunks or need better performance.

### Option B: Vector Database

**Pros:**
- Persistent embeddings
- Fast search at scale
- Automatic updates
- Better for production

**Cons:**
- Additional service to manage
- More complex setup
- Costs money (Pinecone, etc.) or self-hosted

**When to Use:** After Option A proves the concept, or if you have >1000 document chunks.

## Implementation: Option A (Simple File-Based)

### Step 1: Create RAG Service

**File**: `packages/discord-bot/src/services/rag-service.ts`

```typescript
import { readdir, readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import OpenAI from 'openai';

interface DocumentChunk {
  id: string;
  path: string;
  content: string;
  heading?: string;
  embedding?: number[];
}

export class RAGService {
  private openai: OpenAI;
  private docsPath: string;
  private chunks: DocumentChunk[] = [];
  private initialized: boolean = false;

  constructor(docsPath: string, openaiApiKey: string) {
    this.docsPath = docsPath;
    this.openai = new OpenAI({ apiKey: openaiApiKey });
  }

  /**
   * Load all markdown files from docs/game/ recursively
   */
  async loadDocuments(): Promise<void> {
    this.chunks = [];
    await this.loadDirectory(this.docsPath);
    console.log(`[RAG] Loaded ${this.chunks.length} document chunks`);
  }

  private async loadDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, .git, etc.
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await this.loadDirectory(fullPath);
          }
        } else if (entry.isFile() && extname(entry.name) === '.md') {
          await this.loadMarkdownFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`[RAG] Error loading directory ${dirPath}:`, error);
    }
  }

  private async loadMarkdownFile(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const relativePath = filePath.replace(this.docsPath, '').replace(/^[\\/]/, '');

      // Chunk by headings (## or ###)
      const sections = this.chunkByHeadings(content, relativePath);
      this.chunks.push(...sections);
    } catch (error) {
      console.error(`[RAG] Error loading file ${filePath}:`, error);
    }
  }

  /**
   * Split markdown content by headings into chunks
   */
  private chunkByHeadings(content: string, path: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const lines = content.split('\n');
    let currentHeading = '';
    let currentContent: string[] = [];
    let chunkIndex = 0;

    for (const line of lines) {
      // Check if line is a heading (## or ###)
      if (line.match(/^#{2,3}\s+/)) {
        // Save previous chunk
        if (currentContent.length > 0) {
          chunks.push({
            id: `${path}-${chunkIndex}`,
            path,
            heading: currentHeading || 'Introduction',
            content: currentContent.join('\n').trim(),
          });
          chunkIndex++;
        }

        // Start new chunk
        currentHeading = line.replace(/^#{2,3}\s+/, '').trim();
        currentContent = [line]; // Include heading in content
      } else {
        currentContent.push(line);
      }
    }

    // Add final chunk
    if (currentContent.length > 0) {
      chunks.push({
        id: `${path}-${chunkIndex}`,
        path,
        heading: currentHeading || 'Introduction',
        content: currentContent.join('\n').trim(),
      });
    }

    // If no headings found, create single chunk
    if (chunks.length === 0 && content.trim().length > 0) {
      chunks.push({
        id: `${path}-0`,
        path,
        content: content.trim(),
      });
    }

    return chunks;
  }

  /**
   * Create embeddings for all chunks
   */
  async createEmbeddings(): Promise<void> {
    console.log(`[RAG] Creating embeddings for ${this.chunks.length} chunks...`);

    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];

      try {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk.content.substring(0, 8000), // Limit to 8k chars
        });

        chunk.embedding = response.data[0].embedding;

        // Log progress every 10 chunks
        if ((i + 1) % 10 === 0) {
          console.log(`[RAG] Embedded ${i + 1}/${this.chunks.length} chunks`);
        }
      } catch (error) {
        console.error(`[RAG] Error creating embedding for chunk ${chunk.id}:`, error);
      }
    }

    console.log(`[RAG] Embeddings created for ${this.chunks.filter(c => c.embedding).length} chunks`);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Search for relevant document chunks
   */
  async search(query: string, limit: number = 5): Promise<string[]> {
    if (this.chunks.length === 0) {
      console.warn('[RAG] No documents loaded');
      return [];
    }

    // Create embedding for query
    let queryEmbedding: number[];
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });
      queryEmbedding = response.data[0].embedding;
    } catch (error) {
      console.error('[RAG] Error creating query embedding:', error);
      // Fallback to keyword search
      return this.keywordSearch(query, limit);
    }

    // Calculate similarities
    const similarities = this.chunks
      .filter(chunk => chunk.embedding) // Only chunks with embeddings
      .map(chunk => ({
        chunk,
        similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding!),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Return chunk contents
    return similarities.map(s => {
      const header = s.chunk.heading ? `## ${s.chunk.heading}\n` : '';
      return `${header}${s.chunk.content}`;
    });
  }

  /**
   * Fallback keyword search if embeddings fail
   */
  private keywordSearch(query: string, limit: number): string[] {
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/);

    const matches = this.chunks
      .map(chunk => {
        const contentLower = chunk.content.toLowerCase();
        const score = keywords.reduce((score, keyword) => {
          return score + (contentLower.includes(keyword) ? 1 : 0);
        }, 0);
        return { chunk, score };
      })
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return matches.map(m => {
      const header = m.chunk.heading ? `## ${m.chunk.heading}\n` : '';
      return `${header}${m.chunk.content}`;
    });
  }

  /**
   * Initialize: load documents and create embeddings
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadDocuments();
    await this.createEmbeddings();
    this.initialized = true;
  }

  /**
   * Reload documents (call when docs change)
   */
  async reload(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }
}
```

### Step 2: Update ConciergeService

**File**: `packages/discord-bot/src/services/concierge.ts`

**Changes:**

1. Remove `buildKnowledgeBase()` method
2. Add `RAGService` dependency
3. Update `answerQuestion()` to use RAG

```typescript
import { RAGService } from './rag-service';
import { getRAGConfig } from '../config';

export class ConciergeService {
  private openai: OpenAI | null = null;
  private gameApi: GameApiService;
  private ragService: RAGService | null = null;

  constructor() {
    const aiConfig = getAIConfig();
    const ragConfig = getRAGConfig();
    this.gameApi = new GameApiService();

    // Initialize OpenAI if API key is available
    if (aiConfig.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: aiConfig.openaiApiKey,
      });

      // Initialize RAG service
      this.ragService = new RAGService(ragConfig.docsPath, aiConfig.openaiApiKey);
      // Initialize asynchronously (don't block constructor)
      this.ragService.initialize().catch(err => {
        console.error('[RAG] Failed to initialize:', err);
      });
    }
  }

  async answerQuestion(context: ConciergeContext): Promise<string> {
    const { question } = context;

    // Check if question is about specific game data (party, run, player)
    if (this.isDataQuery(question)) {
      return await this.handleDataQuery(question);
    }

    // Get relevant docs via RAG
    let contextDocs = '';
    if (this.ragService) {
      try {
        const relevantDocs = await this.ragService.search(question, 5);
        if (relevantDocs.length > 0) {
          contextDocs = `\n\nRelevant game knowledge:\n${relevantDocs.join('\n\n---\n\n')}`;
        }
      } catch (error) {
        console.error('[RAG] Error searching docs:', error);
        // Continue without RAG context
      }
    }

    // Use AI if available
    if (this.openai) {
      return await this.answerWithAI(question, contextDocs);
    }

    // Fallback to keyword matching
    return this.answerWithKeywords(question);
  }

  private async answerWithAI(question: string, contextDocs: string = ''): Promise<string> {
    if (!this.openai) {
      return this.answerWithKeywords(question);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are the TavernKeeper, a wise and friendly innkeeper and dungeon master in InnKeeper, a dungeon crawler game on the Monad blockchain. You guide adventurers, answer questions about the game, and help them understand the world. You speak in character as a knowledgeable tavern keeper who has seen many adventurers come and go. Be conversational, helpful, and in-character.${contextDocs}\n\nRespond as the TavernKeeper character - friendly, knowledgeable, and encouraging. If you don't know something, say so in character.`,
          },
          {
            role: 'user',
            content: question,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      return this.answerWithKeywords(question);
    }
  }

  // Remove buildKnowledgeBase() method - no longer needed
}
```

### Step 3: Update Config

**File**: `packages/discord-bot/src/config.ts`

**Add:**

```typescript
import path from 'path';

export interface RAGConfig {
  docsPath: string;
  embeddingModel: string;
}

export function getRAGConfig(): RAGConfig {
  // Default to docs/game/ in project root
  const defaultDocsPath = path.resolve(process.cwd(), 'docs/game');

  return {
    docsPath: process.env.DOCS_PATH || defaultDocsPath,
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  };
}
```

### Step 4: Add Dependencies

**File**: `packages/discord-bot/package.json`

**Add:**

```json
{
  "dependencies": {
    "remark": "^15.0.0",
    "remark-parse": "^11.0.0"
  }
}
```

**Note**: These are optional - the implementation above doesn't require them, but you can use them for better markdown parsing if needed.

## Testing RAG Integration

### Test 1: Document Loading
```typescript
const ragService = new RAGService('./docs/game', process.env.OPENAI_API_KEY!);
await ragService.loadDocuments();
console.log(`Loaded ${ragService.chunks.length} chunks`);
```

### Test 2: Embedding Creation
```typescript
await ragService.createEmbeddings();
console.log('Embeddings created');
```

### Test 3: Search
```typescript
const results = await ragService.search('How do parties work?', 3);
console.log('Search results:', results);
```

### Test 4: Integration
```typescript
const concierge = new ConciergeService();
// Wait for RAG to initialize
await new Promise(resolve => setTimeout(resolve, 5000));
const answer = await concierge.answerQuestion({ question: 'Tell me about heroes' });
console.log('Answer:', answer);
```

## Performance Considerations

### Chunking Strategy
- **By Heading**: Current approach - chunks by `##` or `###` headings
- **Fixed Size**: Alternative - chunk by character count (e.g., 500 chars)
- **Sliding Window**: Overlap chunks for better context

**Recommendation**: Start with heading-based chunking. It's semantic and works well for documentation.

### Embedding Costs
- **Model**: `text-embedding-3-small` (cheapest, $0.02 per 1M tokens)
- **Chunk Size**: Limit to 8000 characters per chunk
- **Caching**: Store embeddings in JSON file to avoid regeneration

**Cost Estimate**:
- 100 chunks × ~500 tokens each = 50k tokens
- Cost: ~$0.001 per full embedding generation
- One-time cost, then cache

### Caching Embeddings

**File**: `packages/discord-bot/src/services/rag-service.ts`

**Add:**

```typescript
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

private embeddingsCachePath = join(process.cwd(), '.cache', 'embeddings.json');

async loadCachedEmbeddings(): Promise<void> {
  try {
    const cache = JSON.parse(await readFile(this.embeddingsCachePath, 'utf-8'));
    // Match chunks to cached embeddings by path + content hash
    // ... implementation
  } catch (error) {
    // Cache doesn't exist, will create new
  }
}

async saveEmbeddingsCache(): Promise<void> {
  const cache = this.chunks.map(chunk => ({
    id: chunk.id,
    embedding: chunk.embedding,
  }));
  await writeFile(this.embeddingsCachePath, JSON.stringify(cache, null, 2));
}
```

## Migration Path to Option B (Vector Database)

If you need to scale beyond simple file-based RAG:

### Using Supabase Vector (Recommended)
- Supabase has built-in vector support (pgvector)
- No additional service needed
- Free tier available

### Using Pinecone
- Managed vector database
- Easy to use
- Costs money after free tier

### Implementation Steps
1. Create vector column in Supabase
2. Store embeddings in database instead of memory
3. Use Supabase vector search functions
4. Update `RAGService` to use database queries

## Troubleshooting

### "No documents loaded"
- Check `docs/game/` folder exists
- Verify markdown files are present
- Check file permissions

### "Embedding creation failed"
- Verify `OPENAI_API_KEY` is set
- Check API key is valid
- Check rate limits

### "Search returns no results"
- Verify embeddings were created
- Check query is not too short/vague
- Try keyword search fallback

### "Slow search performance"
- Consider caching embeddings
- Reduce chunk count
- Use vector database for >1000 chunks

## Next Steps

1. Create `docs/game/` folder structure (see handoff doc)
2. Implement `RAGService` as shown above
3. Update `ConciergeService` to use RAG
4. Test with sample queries
5. Add embedding caching for performance
6. Monitor costs and performance
7. Migrate to vector DB if needed

## References

- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings
- Supabase Vector: https://supabase.com/docs/guides/ai/vector-columns
- RAG Best Practices: https://www.pinecone.io/learn/retrieval-augmented-generation/
