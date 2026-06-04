#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { parse } from 'yaml';
import { collections } from '../collections.js';

const OUTPUT_FILE = 'docs/search.json';

interface ContentNode {
  id: string;
  collection: string;
  title: string;
  body: string;
  tags: string[];
  date: string | null;
  compiledFilename: string;
  description?: string;
}

interface SearchDocument {
  id: string;
  title: string;
  url: string;
  description: string;
  collection: string;
  date: string | null;
}

interface SearchIndex {
  version: string;
  generatedAt: string;
  documents: SearchDocument[];
  idf: Record<string, number>;
  tfidf: Record<string, Record<string, number>>;
}

// Common English stop words (from text.ts)
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
  'might', 'must', 'shall', 'can', 'need', 'it', 'its', 'this', 'that', 'these',
  'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'when',
  'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'about', 'after',
  'before', 'above', 'below', 'between', 'into', 'through', 'during', 'under',
  'again', 'further', 'then', 'once', 'any', 'if', 'because', 'while', 'until',
  'although', 'though', 'even', 'being', 'having', 'doing', 'their', 'his', 'her',
  'him', 'my', 'your', 'our', 'me', 'us', 'them', 'myself', 'yourself', 'himself',
  'herself', 'itself', 'ourselves', 'themselves',
  // Common blog/tech words
  'example', 'like', 'using', 'use', 'used', 'way', 'want', 'get', 'see', 'new',
  'one', 'two', 'first', 'last', 'well', 'much', 'actually', 'really', 'say',
  'said', 'thing', 'things', 'something', 'lot', 'make', 'made', 'going', 'know',
  'think', 'still', 'back', 'take', 'look', 'come', 'since',
]);

async function main() {
  console.log('Building search index...');

  // Load all content
  const nodes = await loadAllContent();
  console.log(`Loaded ${nodes.length} documents`);

  // Build document frequency map
  const documentFrequency = new Map<string, number>();
  const nodeTerms = new Map<string, Map<string, number>>();

  for (const node of nodes) {
    const terms = extractTerms(node.title, node.body);
    nodeTerms.set(node.id, terms);

    // Count document frequency (each term counted once per doc)
    const seenTerms = new Set<string>();
    for (const term of terms.keys()) {
      if (!seenTerms.has(term)) {
        documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
        seenTerms.add(term);
      }
    }
  }

  // Compute IDF: log((N + 1) / (df + 1)) + 1
  const N = nodes.length;
  const idf: Record<string, number> = {};
  for (const [term, df] of documentFrequency) {
    // Only include terms that appear in more than one document
    // and less than 80% of documents (too common)
    if (df > 1 && df < N * 0.8) {
      idf[term] = Math.round((Math.log((N + 1) / (df + 1)) + 1) * 1000) / 1000;
    }
  }
  console.log(`${Object.keys(idf).length} unique terms in index`);

  // Compute TF-IDF vectors (sparse representation)
  const tfidf: Record<string, Record<string, number>> = {};
  for (const node of nodes) {
    const terms = nodeTerms.get(node.id)!;
    const totalTerms = [...terms.values()].reduce((a, b) => a + b, 0);

    const vector: Record<string, number> = {};
    for (const [term, count] of terms) {
      if (idf[term] !== undefined) {
        const tf = count / totalTerms;
        const score = tf * idf[term];
        // Only store if score is meaningful
        if (score > 0.001) {
          vector[term] = Math.round(score * 10000) / 10000;
        }
      }
    }
    tfidf[node.id] = vector;
  }

  // Build document list
  const documents: SearchDocument[] = nodes.map((node) => ({
    id: node.id,
    title: node.title,
    url: '/' + node.compiledFilename,
    description: node.description || extractDescription(node.body),
    collection: node.collection || 'blog',
    date: node.date,
  }));

  const searchIndex: SearchIndex = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    documents,
    idf,
    tfidf,
  };

  // Write minified — this file is no longer committed to git; it is uploaded to
  // R2 and served by the worker (tantaman.com/search.json), so keep it small.
  const outputPath = path.join(process.cwd(), OUTPUT_FILE);
  await fs.writeFile(outputPath, JSON.stringify(searchIndex));

  const stats = await fs.stat(outputPath);
  console.log(`Written to ${OUTPUT_FILE} (${Math.round(stats.size / 1024)}KB)`);
}

/**
 * Load all content from collections
 */
async function loadAllContent(): Promise<ContentNode[]> {
  const nodes: ContentNode[] = [];

  for (const collection of collections) {
    const contentDir = path.join(process.cwd(), 'content', collection);

    let files: string[];
    try {
      files = await fs.readdir(contentDir);
    } catch {
      continue;
    }

    const mdFiles = files.filter((file) => {
      const ext = path.extname(file);
      const basename = path.basename(file, ext);
      return (
        (ext === '.md' || ext === '.mdx') &&
        basename !== '404' &&
        basename !== 'README' &&
        !file.startsWith('.') &&
        !file.endsWith('.js')
      );
    });

    for (const file of mdFiles) {
      const filePath = path.join(contentDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const node = parseContent(file, collection, content);
      nodes.push(node);
    }
  }

  return nodes;
}

/**
 * Parse content file into ContentNode
 */
function parseContent(
  filename: string,
  collection: string,
  content: string
): ContentNode {
  const match = content.match(/^---\n([\s\S]*?)\n---([\s\S]*)/);
  const frontmatter = match ? parse(match[1]) : {};
  const body = match ? match[2] : content;

  let date = frontmatter.date || null;
  if (!date) {
    const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    date = dateMatch ? dateMatch[1] : null;
  }

  return {
    id: collection + filename,
    collection,
    title: frontmatter.title || filename.replace(/\.(md|mdx)$/, ''),
    body,
    tags: frontmatter.tags || [],
    date,
    description: frontmatter.description,
    compiledFilename:
      collection + path.basename(filename, path.extname(filename)) + '.html',
  };
}

/**
 * Extract terms from title and body with term frequency
 */
function extractTerms(title: string, body: string): Map<string, number> {
  const terms = new Map<string, number>();

  // Title terms weighted 3x
  for (const term of tokenize(title)) {
    terms.set(term, (terms.get(term) || 0) + 3);
  }

  // Body terms
  for (const term of tokenize(body)) {
    terms.set(term, (terms.get(term) || 0) + 1);
  }

  return terms;
}

/**
 * Tokenize text into stemmed terms
 */
function tokenize(text: string): string[] {
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
  return cleaned
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .map(stem);
}

/**
 * Simple Porter-like stemmer
 */
function stem(word: string): string {
  if (word.length < 4) return word;

  const suffixes = [
    'ingly', 'edly', 'ness', 'ment', 'able', 'ible', 'tion', 'sion',
    'ance', 'ence', 'ally', 'ful', 'ous', 'ive', 'ing', 'ion', 'ity',
    'ies', 'ly', 'ed', 'er', 'es', 's',
  ];

  for (const suffix of suffixes) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length);
    }
  }

  return word;
}

/**
 * Extract description from body (first ~150 chars)
 */
function extractDescription(body: string): string {
  // Remove frontmatter, code, markdown syntax
  let text = body
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, display) => display || target)
    .replace(/<[^>]+>/g, '')
    .replace(/[#*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length > 150) {
    text = text.slice(0, 147) + '...';
  }
  return text;
}

main().catch((error) => {
  console.error('Failed to build search index:', error);
  process.exit(1);
});
