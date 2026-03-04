import type { RelationshipConfig } from './types.js';

export const defaultConfig: RelationshipConfig = {
  signals: {
    wikilink: {
      enabled: true,
      weight: 2.5,
      options: {
        bidirectionalBonus: 1.5,
      },
    },
    semantic: {
      enabled: true,
      weight: 2.0,
      options: {
        minSimilarity: 0.35,
      },
    },
    text: {
      enabled: false, // Disabled: TF-IDF matches common words, not meaning
      weight: 1.0,
      options: {
        minSimilarity: 0.1,
        maxKeywords: 15,
      },
    },
    temporal: {
      enabled: false, // Disabled: Date proximity doesn't imply topic similarity
      weight: 0.5,
      options: {
        decayRate: 0.03, // exp(-0.03 * days)
        maxDays: 365,
      },
    },
    collection: {
      enabled: false, // Disabled: Same collection doesn't mean related content
      weight: 0.3,
      options: {},
    },
    tags: {
      enabled: false, // Disabled: Too coarse-grained
      weight: 0.3,
      options: {},
    },
  },
  scoring: {
    minThreshold: 0.25,
    maxRelated: 10,
    multiSignalBonus: 0.05,
  },
  embedding: {
    model: 'text-embedding-3-large',
    dimensions: 3072,
  },
  knn: {
    k: 10,
    useSNN: true,
  },
};

// Cross-collection affinity matrix
// Higher values = more likely to relate across collections
export const collectionAffinity: Record<string, Record<string, number>> = {
  '': {
    // blog
    '': 0.3,
    'the-mirror-room/': 0.4,
    'chats/': 0.3,
    'notes/': 0.5,
    'bookmarks/': 0.2,
  },
  'the-mirror-room/': {
    // stories
    '': 0.4,
    'the-mirror-room/': 0.5,
    'chats/': 0.4,
    'notes/': 0.2,
    'bookmarks/': 0.1,
  },
  'chats/': {
    '': 0.3,
    'the-mirror-room/': 0.4,
    'chats/': 0.3,
    'notes/': 0.3,
    'bookmarks/': 0.2,
  },
  'notes/': {
    '': 0.5,
    'the-mirror-room/': 0.2,
    'chats/': 0.3,
    'notes/': 0.4,
    'bookmarks/': 0.5,
  },
  'bookmarks/': {
    '': 0.2,
    'the-mirror-room/': 0.1,
    'chats/': 0.2,
    'notes/': 0.5,
    'bookmarks/': 0.3,
  },
};
