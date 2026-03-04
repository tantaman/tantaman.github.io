#!/usr/bin/env node

import { buildRelationshipGraph } from '../relationships/index.js';

async function main() {
  const args = process.argv.slice(2);
  const forceRebuild = args.includes('--force') || args.includes('-f');
  const skipEmbeddings = args.includes('--skip-embeddings') || args.includes('-s');
  const diagnostics = args.includes('--diagnostics') || args.includes('-d');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
Usage: relationships [options]

Compute content relationships based on semantic similarity, wiki-links,
temporal proximity, and other signals.

Options:
  -f, --force           Force full rebuild (ignore cache)
  -s, --skip-embeddings Skip embedding computation (faster, less accurate)
  -d, --diagnostics     Print raw similarity score distribution diagnostics
  -h, --help            Show this help message

Output:
  .relationships.json   Relationship graph data
  .relationships-cache.json  Cache for incremental builds

The relationship graph is used by:
  - graph.js for visualization
  - defaultLayout.tsx for related posts footer
`);
    return;
  }

  console.log('='.repeat(50));
  console.log('Content Relationship Builder');
  console.log('='.repeat(50));
  console.log();

  if (forceRebuild) {
    console.log('Force rebuild enabled');
  }
  if (skipEmbeddings) {
    console.log('Skipping embeddings (using TF-IDF only)');
  }
  if (diagnostics) {
    console.log('Diagnostics enabled');
  }
  console.log();

  try {
    const graph = await buildRelationshipGraph({
      forceRebuild,
      skipEmbeddings,
      diagnostics,
    });

    console.log();
    console.log('='.repeat(50));
    console.log('Summary');
    console.log('='.repeat(50));
    console.log(`Total documents: ${graph.metadata.totalNodes}`);
    console.log(`Total relationships: ${graph.metadata.totalEdges}`);
    console.log(`Build time: ${graph.metadata.buildTimeMs}ms`);
    console.log(`Signals used: ${graph.metadata.signalsUsed.join(', ')}`);
    console.log();
    console.log('Output: .relationships.json');
  } catch (error) {
    console.error('Failed to build relationships:', error);
    process.exit(1);
  }
}

main();
