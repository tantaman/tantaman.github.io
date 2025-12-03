# TODO

1. Cleanup tts code
  2. Convert the-mirror-room to most high quality audio
3. Print a booklet for wonderland books

- rm old src: 58fd02e
- https://unifiedjs.com/explore/package/rehype-meta/ for open graph
  - auto-tweet, macro blog -- https://alecmuffett.com/article/13253

## Print Shop
https://claude.ai/chat/6ebf058a-b357-4e9c-aa82-4e68f4a9c769

Print shop, single book orders: https://claude.ai/chat/6ebf058a-b357-4e9c-aa82-4e68f4a9c769

Mixam maybe best? Can do small orders on cheap?

Amazon KDP: https://kdp.amazon.com/en_US/


## Post on the conversion

https://twitter.com/Tantaman/status/1524057494829547521

---

https://github.com/kentcdodds/mdx-bundler

- utterances reconfigure:
  - https://github.com/tantaman/tantaman.github.io/blob/6ad856d10d9ad0f363b55cfecacd14b5936491e5/_includes/utterances-comment.html


---

 Content Relationship System Design

 Overview

 Build a sophisticated content relationship pipeline that surfaces meaningful connections between posts based on semantic similarity, wiki-links, temporal proximity, and cross-collection themes. Runs as a separate CLI command (pnpm relationships) to
 avoid slowing regular builds.

 Architecture

 ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
 │  Content Files  │───▶│  Signal Pipeline │───▶│ .relationships  │
 │  (md/mdx)       │    │  (extractors)    │    │     .json       │
 └─────────────────┘    └──────────────────┘    └────────┬────────┘
                                                         │
                        ┌────────────────────────────────┼────────┐
                        ▼                                ▼        ▼
                  ┌──────────┐                    ┌──────────┐ ┌──────┐
                  │ graph.js │                    │ layout   │ │ API  │
                  │ (viz)    │                    │ footer   │ │query │
                  └──────────┘                    └──────────┘ └──────┘

 Signal Extractors (Priority Order)

 | Signal        | Weight | Description                                     |
 |---------------|--------|-------------------------------------------------|
 | Wiki-links    | 2.5    | Explicit [[note]] references - strongest signal |
 | Semantic      | 2.0    | Embedding cosine similarity (transformers.js)   |
 | Text/Keywords | 1.0    | TF-IDF for keyword overlap (fast fallback)      |
 | Temporal      | 0.5    | Posts within 30-day window get weak boost       |
 | Collection    | 0.3    | Cross-collection affinity matrix                |
 | Tags          | 0.3    | Shared tags (low weight - too coarse)           |

 Implementation Steps

 Step 1: Create Relationship Module Structure

 Create packages/compiler/src/relationships/:
 relationships/
   index.ts              # Main entry, exports buildRelationships()
   types.ts              # TypeScript interfaces
   config.ts             # Default weights, thresholds
   signals/
     base.ts             # SignalExtractor interface
     wikilink.ts         # Parse [[links]], build link graph
     semantic.ts         # transformers.js embeddings
     text.ts             # TF-IDF keyword extraction
     temporal.ts         # Date proximity scoring
     collection.ts       # Cross-collection affinity
     tags.ts             # Tag overlap (Jaccard)
   scorer.ts             # Combine signals with weights
   cache.ts              # Content hashing, incremental updates
   embeddings/
     index.ts            # Embedding service abstraction
     transformers.ts     # transformers.js implementation

 Step 2: Add Dependencies

 File: packages/compiler/package.json

 {
   "dependencies": {
     "@xenova/transformers": "^2.17.0",
     "mdast-util-to-string": "^4.0.0"
   }
 }

 - @xenova/transformers: Local embeddings (~25MB, uses Xenova/all-MiniLM-L6-v2)
 - mdast-util-to-string: Extract plain text from markdown AST (tiny, already in unified ecosystem)

 Step 3: Implement Core Types

 File: packages/compiler/src/relationships/types.ts

 export interface ContentNode {
   id: string;                    // filename
   collection: string;            // '', 'the-mirror-room/', etc.
   title: string;
   body: string;                  // markdown content
   tags: string[];
   date: string | null;
   wikiLinks: string[];           // outbound [[links]]
 }

 export interface RelationshipEdge {
   source: string;
   target: string;
   score: number;                 // 0-1 normalized
   signals: SignalBreakdown[];
   edgeType: 'explicit' | 'semantic' | 'inferred';
 }

 export interface SignalBreakdown {
   name: string;
   score: number;
   weight: number;
 }

 export interface RelationshipGraph {
   version: string;
   generatedAt: string;
   posts: Record<string, {
     related: Array<{ id: string; score: number; type: string }>;
     backlinks: string[];
     keywords: string[];
     cluster?: number;
   }>;
   edges: RelationshipEdge[];
 }

 Step 4: Implement Signal Extractors

 Each signal follows this interface:

 interface SignalExtractor<T = any> {
   name: string;
   extract(node: ContentNode, corpus: ContentNode[]): T;
   computeScore(nodeA: ContentNode, nodeB: ContentNode, dataA: T, dataB: T): number;
 }

 4a: Wiki-link Signal (signals/wikilink.ts)

 - Parse [[target]] and [[target|display]] patterns from body
 - Normalize targets (lowercase, replace spaces with hyphens)
 - Score: 1.0 for bidirectional link, 0.7 for unidirectional
 - Build backlinks map for "what links here" feature

 4b: Semantic Signal (signals/semantic.ts)

 - Use @xenova/transformers with Xenova/all-MiniLM-L6-v2 model
 - Generate 384-dim embedding per document
 - Cache embeddings by content hash (only recompute on change)
 - Cosine similarity between embeddings
 - Storage: ~150KB for 100 docs (JSON with float precision reduction)

 4c: Text/TF-IDF Signal (signals/text.ts)

 - Extract plain text (strip markdown, code blocks, URLs)
 - Tokenize, remove stopwords, stem (lightweight Porter stemmer)
 - Compute TF-IDF vectors per document
 - Cosine similarity for fast keyword matching
 - Acts as fallback when embeddings unavailable

 4d: Temporal Signal (signals/temporal.ts)

 - Extract date from filename (YYYY-MM-DD-title.md) or frontmatter
 - Exponential decay: score = exp(-0.03 * daysDiff)
 - Full score within 7 days, half at ~23 days, near-zero at 100+ days

 4e: Collection Signal (signals/collection.ts)

 - Affinity matrix for cross-collection relationships:
 blog ↔ stories: 0.4 (thematic overlap)
 blog ↔ notes: 0.5 (reference material)
 stories ↔ chats: 0.3 (philosophical themes)
 - Boost when different collections connect on topic

 4f: Tag Signal (signals/tags.ts)

 - Jaccard similarity of tag sets
 - Low weight (0.3) since tags are coarse

 Step 5: Implement Scoring System

 File: packages/compiler/src/relationships/scorer.ts

 function computeCombinedScore(contributions: SignalBreakdown[]): number {
   const totalWeight = contributions.reduce((sum, c) => sum + c.weight, 0);
   const weightedSum = contributions.reduce((sum, c) => sum + c.score * c.weight, 0);

   let score = weightedSum / totalWeight;

   // Multi-signal agreement bonus (0.05 per agreeing signal)
   const activeSignals = contributions.filter(c => c.score > 0.1).length;
   score += Math.min(activeSignals * 0.05, 0.15);

   return Math.min(score, 1.0);
 }

 Step 6: Implement CLI Command

 File: packages/compiler/src/bin/relationships.ts

 #!/usr/bin/env node
 import { buildRelationshipGraph } from '../relationships/index.js';

 async function main() {
   const forceRebuild = process.argv.includes('--force');

   console.log('Computing content relationships...');
   const startTime = Date.now();

   const graph = await buildRelationshipGraph({ forceRebuild });

   console.log(`Generated ${graph.edges.length} relationships in ${Date.now() - startTime}ms`);
   console.log(`Output: .relationships.json`);
 }

 main().catch(console.error);

 Add to package.json:
 {
   "bin": {
     "relationships": "./dist/bin/relationships.js"
   },
   "scripts": {
     "relationships": "relationships"
   }
 }

 Usage: pnpm relationships or pnpm relationships --force

 Step 7: Implement Caching

 File: packages/compiler/src/relationships/cache.ts

 - Hash each file's content (MD5, first 16 chars)
 - Store in .relationships-cache.json:
 {
   "version": "1.0",
   "configHash": "abc123",
   "hashes": { "post.md": "def456" },
   "embeddings": { "post.md": [0.12, -0.34, ...] }
 }
 - On run: compare hashes, only recompute changed files
 - Embeddings cached separately (expensive to compute)
 - Full rebuild if: config changes, >30% files changed, or --force

 Step 8: Output Format

 File: .relationships.json (project root)

 {
   "version": "1.0.0",
   "generatedAt": "2025-12-03T00:00:00Z",
   "config": {
     "model": "Xenova/all-MiniLM-L6-v2",
     "minScore": 0.25
   },
   "posts": {
     "2022-08-23-why-sqlite-why-now.md": {
       "related": [
         { "id": "2022-10-18-lamport-clock.md", "score": 0.82, "type": "semantic" },
         { "id": "notes/distributed systems.md", "score": 0.71, "type": "explicit" }
       ],
       "backlinks": ["notes/sqlite.md"],
       "keywords": ["sqlite", "distributed", "edge"]
     }
   },
   "edges": [...]
 }

 Step 9: Integrate with graph.js

 File: content/graph.js

 Modify to read .relationships.json:

 // Load computed relationships
 let relationships = null;
 try {
   relationships = JSON.parse(await fs.promises.readFile('.relationships.json', 'utf8'));
 } catch (e) {
   console.warn('No .relationships.json, falling back to tags');
 }

 // Use relationship edges with styling by type
 for (const edge of relationships?.edges || []) {
   edges.push({
     from: edge.source,
     to: edge.target,
     value: Math.round(edge.score * 5),
     color: getEdgeColor(edge.edgeType),
     title: `${edge.edgeType}: ${(edge.score * 100).toFixed(0)}%`
   });
 }

 Edge colors by type:
 - explicit (wiki-links): solid orange, thick
 - semantic: blue, medium
 - inferred (tags/temporal): gray dashed, thin

 Step 10: Update Layout Footer

 File: packages/compiler/src/layouts/defaultLayout.tsx

 Modify buildFooter() to use relationships:

 async function buildFooter(file: VFile) {
   const relationships = await loadRelationships();
   const related = relationships?.posts?.[file.basename]?.related || [];

   if (related.length > 0) {
     // Show top 5 related posts from relationship system
     return renderRelatedPosts(related.slice(0, 5));
   }

   // Fallback to existing tag-based logic
   return buildTagBasedFooter(file);
 }

 Files to Create/Modify

 New Files

 - packages/compiler/src/relationships/index.ts
 - packages/compiler/src/relationships/types.ts
 - packages/compiler/src/relationships/config.ts
 - packages/compiler/src/relationships/scorer.ts
 - packages/compiler/src/relationships/cache.ts
 - packages/compiler/src/relationships/signals/base.ts
 - packages/compiler/src/relationships/signals/wikilink.ts
 - packages/compiler/src/relationships/signals/semantic.ts
 - packages/compiler/src/relationships/signals/text.ts
 - packages/compiler/src/relationships/signals/temporal.ts
 - packages/compiler/src/relationships/signals/collection.ts
 - packages/compiler/src/relationships/signals/tags.ts
 - packages/compiler/src/relationships/embeddings/index.ts
 - packages/compiler/src/relationships/embeddings/transformers.ts
 - packages/compiler/src/bin/relationships.ts

 Modified Files

 - packages/compiler/package.json - Add dependencies and bin entry
 - content/graph.js - Read from .relationships.json
 - packages/compiler/src/layouts/defaultLayout.tsx - Use relationship data for footer

 Generated Files (gitignored)

 - .relationships.json - Relationship graph output
 - .relationships-cache.json - Embedding cache

 Performance Expectations

 | Operation                   | Time (120 docs) |
 |-----------------------------|-----------------|
 | First run (with embeddings) | ~2-3 minutes    |
 | Incremental (few changes)   | ~5-10 seconds   |
 | No changes (cache hit)      | <100ms          |

 Future Enhancements (Not in Scope)

 - Ollama integration for better local embeddings
 - Cluster visualization (topic groups)
 - "Similar posts" API endpoint
 - Relationship quality dashboard