import type { ContentNode, SignalBreakdown, SignalConfig } from '../types.js';
import type { SignalExtractor } from './base.js';

interface TextData {
  terms: Map<string, number>; // term -> count
  termFrequency: Map<string, number>; // term -> TF
  titleTerms: Set<string>;
  totalTerms: number;
}

interface GlobalTextData {
  idf: Map<string, number>;
  documentFrequency: Map<string, number>;
  totalDocuments: number;
}

// Common English stop words
export const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'were',
  'been',
  'be',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'can',
  'need',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'i',
  'you',
  'he',
  'she',
  'we',
  'they',
  'what',
  'which',
  'who',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'just',
  'also',
  'now',
  'here',
  'there',
  'about',
  'after',
  'before',
  'above',
  'below',
  'between',
  'into',
  'through',
  'during',
  'under',
  'again',
  'further',
  'then',
  'once',
  'any',
  'if',
  'because',
  'while',
  'until',
  'although',
  'though',
  'even',
  'being',
  'having',
  'doing',
  'their',
  'his',
  'her',
  'him',
  'my',
  'your',
  'our',
  'me',
  'us',
  'them',
  'myself',
  'yourself',
  'himself',
  'herself',
  'itself',
  'ourselves',
  'themselves',
  // Common blog/tech words
  'example',
  'like',
  'using',
  'use',
  'used',
  'way',
  'want',
  'get',
  'see',
  'new',
  'one',
  'two',
  'first',
  'last',
  'well',
  'much',
  'actually',
  'really',
  'say',
  'said',
  'thing',
  'things',
  'something',
  'lot',
  'make',
  'made',
  'going',
  'know',
  'think',
  'still',
  'back',
  'take',
  'look',
  'come',
  'since',
]);

/**
 * Text similarity signal using TF-IDF
 *
 * Extracts keywords and computes cosine similarity between documents.
 * Acts as a fallback when embeddings are unavailable.
 */
export const textSignal: SignalExtractor<TextData> = {
  name: 'text',
  isSymmetric: true,

  extract(node: ContentNode): TextData {
    const terms = new Map<string, number>();
    const titleTerms = new Set<string>();

    // Process title (weight higher)
    const titleTokens = extractTerms(node.title);
    for (const term of titleTokens) {
      terms.set(term, (terms.get(term) || 0) + 3); // Title weight
      titleTerms.add(term);
    }

    // Process body
    const bodyTokens = extractTerms(node.body);
    for (const term of bodyTokens) {
      terms.set(term, (terms.get(term) || 0) + 1);
    }

    // Compute term frequency
    const totalTerms = [...terms.values()].reduce((a, b) => a + b, 0);
    const termFrequency = new Map<string, number>();
    for (const [term, count] of terms) {
      termFrequency.set(term, count / totalTerms);
    }

    return {
      terms,
      termFrequency,
      titleTerms,
      totalTerms,
    };
  },

  computeGlobalData(corpus: ContentNode[]): GlobalTextData {
    const documentFrequency = new Map<string, number>();

    for (const node of corpus) {
      const seenTerms = new Set<string>();
      const allTerms = [
        ...extractTerms(node.title),
        ...extractTerms(node.body),
      ];

      for (const term of allTerms) {
        if (!seenTerms.has(term)) {
          documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
          seenTerms.add(term);
        }
      }
    }

    // Compute IDF: log((N + 1) / (df + 1)) + 1
    const idf = new Map<string, number>();
    const N = corpus.length;
    for (const [term, df] of documentFrequency) {
      idf.set(term, Math.log((N + 1) / (df + 1)) + 1);
    }

    return {
      idf,
      documentFrequency,
      totalDocuments: N,
    };
  },

  computeScore(
    _nodeA: ContentNode,
    _nodeB: ContentNode,
    dataA: TextData,
    dataB: TextData,
    config: SignalConfig,
    globalData?: unknown
  ): SignalBreakdown {
    const global = globalData as GlobalTextData | undefined;

    if (dataA.totalTerms === 0 || dataB.totalTerms === 0) {
      return {
        name: 'text',
        score: 0,
        weight: config.weight,
        details: { reason: 'empty_content' },
      };
    }

    // Compute cosine similarity using TF-IDF vectors
    const allTerms = new Set([...dataA.terms.keys(), ...dataB.terms.keys()]);

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const term of allTerms) {
      const tfA = dataA.termFrequency.get(term) || 0;
      const tfB = dataB.termFrequency.get(term) || 0;
      const idf = global?.idf.get(term) || 1;

      const tfidfA = tfA * idf;
      const tfidfB = tfB * idf;

      dotProduct += tfidfA * tfidfB;
      normA += tfidfA * tfidfA;
      normB += tfidfB * tfidfB;
    }

    const cosineSim =
      normA > 0 && normB > 0
        ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
        : 0;

    // Bonus for shared title terms
    const sharedTitleTerms = [...dataA.titleTerms].filter((t) =>
      dataB.titleTerms.has(t)
    );
    const titleBonus = Math.min(sharedTitleTerms.length * 0.05, 0.15);

    const score = Math.min(cosineSim + titleBonus, 1.0);

    // Check minimum threshold
    const minSimilarity = (config.options?.minSimilarity as number) || 0.1;
    if (score < minSimilarity) {
      return {
        name: 'text',
        score: 0,
        weight: config.weight,
        details: { cosineSim, reason: 'below_threshold' },
      };
    }

    return {
      name: 'text',
      score,
      weight: config.weight,
      details: {
        cosineSim,
        sharedTitleTerms,
        titleBonus,
      },
    };
  },
};

/**
 * Extract terms from text, removing markdown and stopwords
 */
export function extractTerms(text: string): string[] {
  if (!text) return [];

  // Remove code blocks
  let cleaned = text.replace(/```[\s\S]*?```/g, '');
  // Remove inline code
  cleaned = cleaned.replace(/`[^`]+`/g, '');
  // Remove markdown links but keep text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/\S+/g, '');
  // Remove wiki-links
  cleaned = cleaned.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1');
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  // Keep only alphanumeric and spaces
  cleaned = cleaned.replace(/[^a-zA-Z\s]/g, ' ');
  // Lowercase
  cleaned = cleaned.toLowerCase();

  // Tokenize and filter
  const tokens = cleaned
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  // Simple stemming (just remove common suffixes)
  return tokens.map(stem);
}

/**
 * Simple Porter-like stemmer
 */
export function stem(word: string): string {
  if (word.length < 4) return word;

  // Remove common suffixes
  const suffixes = [
    'ingly',
    'edly',
    'ness',
    'ment',
    'able',
    'ible',
    'tion',
    'sion',
    'ance',
    'ence',
    'ally',
    'ful',
    'ous',
    'ive',
    'ing',
    'ion',
    'ity',
    'ies',
    'ly',
    'ed',
    'er',
    'es',
    's',
  ];

  for (const suffix of suffixes) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length);
    }
  }

  return word;
}

/**
 * Extract top keywords from a document
 */
export function extractKeywords(
  node: ContentNode,
  globalData: GlobalTextData,
  maxKeywords: number = 15
): string[] {
  const terms = new Map<string, number>();

  // Process title with higher weight
  for (const term of extractTerms(node.title)) {
    terms.set(term, (terms.get(term) || 0) + 3);
  }

  // Process body
  for (const term of extractTerms(node.body)) {
    terms.set(term, (terms.get(term) || 0) + 1);
  }

  // Score by TF-IDF
  const scored: [string, number][] = [];
  const totalTerms = [...terms.values()].reduce((a, b) => a + b, 0);

  for (const [term, count] of terms) {
    const tf = count / totalTerms;
    const idf = globalData.idf.get(term) || 1;
    scored.push([term, tf * idf]);
  }

  // Sort by score and return top keywords
  scored.sort((a, b) => b[1] - a[1]);
  return scored.slice(0, maxKeywords).map(([term]) => term);
}

export default textSignal;
