import {
  doc,
  meta,
  layout,
  rehypeDocument,
  indexFrontmatter,
} from '@tantaman/sitecompiler';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import rehypeMeta from 'rehype-meta';
import rehypeParse from 'rehype-parse';
import fs from 'fs';
import path from 'path';

// Try to load computed relationships (with clustering support v2)
let relationships = null;
try {
  const relationshipsPath = path.join(process.cwd(), '.relationships.json');
  const data = fs.readFileSync(relationshipsPath, 'utf8');
  relationships = JSON.parse(data);
  console.log(`Loaded ${relationships.edges?.length || 0} computed relationships`);
  if (relationships.clusters) {
    console.log(`Loaded ${relationships.clusters.clusterMeta?.length || 0} clusters`);
  }
} catch (e) {
  console.log('No .relationships.json found, using tag-based relationships only');
}

// Helper to compute node position within cluster (golden angle spiral)
function computeNodePosition(clusterId, clusterMeta, nodeIndexInCluster, totalNodesInCluster) {
  const cluster = clusterMeta.find(c => c.id === clusterId);
  if (!cluster) {
    return { x: 0, y: 0 };
  }

  const clusterRadius = Math.sqrt(totalNodesInCluster) * 80;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const angle = nodeIndexInCluster * goldenAngle;
  const r = clusterRadius * Math.sqrt(nodeIndexInCluster / Math.max(totalNodesInCluster, 1));

  return {
    x: cluster.centerX + Math.cos(angle) * r,
    y: cluster.centerY + Math.sin(angle) * r,
  };
}

export default async function graph(file, cwd, files) {
  return {
    content: async () => {
      const result = await unified()
        .use(rehypeParse)
        .use(rehypeDocument, {
          ...doc,
          css: doc.css.concat(['/graph.css']),
          js: doc.js.concat([
            'https://unpkg.com/vis-network@latest/standalone/umd/vis-network.min.js',
            '/graph.js'
          ]),
          title: 'Content Graph',
        })
        .use(rehypeMeta, {
          ...meta,
          title: 'Content Graph - Tantamanlands',
          description: 'Explore connections between posts, stories, and chats',
        })
        .use(() => (tree, file) => {
          file.data.matter = { ...file.data.matter, minimalHeader: true };
        })
        .use(layout)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(await graphPage());

      return result.toString();
    },
    frontmatter: {
      title: 'Content Graph',
      description: 'Explore connections between posts, stories, and chats',
      minimalHeader: true,
    },
    greymatter: {},
  };
}

async function graphPage() {
  const indices = await indexFrontmatter();

  // Build nodes and edges
  const nodes = [];
  const edges = [];
  const postsByFilename = new Map();

  // Get cluster data if available
  const clusterData = relationships?.clusters;
  const nodeCluster = clusterData?.nodeCluster || {};
  const clusterMeta = clusterData?.clusterMeta || [];

  // Track node counts per cluster for positioning
  const clusterNodeCounts = new Map();
  const clusterNodeIndices = new Map();

  // Count nodes per cluster first
  if (clusterMeta.length > 0) {
    for (const meta of clusterMeta) {
      clusterNodeCounts.set(meta.id, meta.nodeCount);
      clusterNodeIndices.set(meta.id, 0);
    }
  }

  // First pass: create nodes
  Object.entries(indices).forEach(([collection, index]) => {
    // Skip bookmarks and notes
    if (collection === 'bookmarks/' || collection === 'notes/') {
      return;
    }

    // Get collection name for display
    let collectionName = collection;
    let collectionGroup = 0;
    switch (collection) {
      case '':
        collectionName = 'blog';
        collectionGroup = 1;
        break;
      case 'the-mirror-room/':
        collectionName = 'stories';
        collectionGroup = 2;
        break;
      case 'chats/':
        collectionName = 'chats';
        collectionGroup = 3;
        break;
    }

    // Process each post in the collection
    Object.entries(index).forEach(([filename, postMeta]) => {
      // Skip non-content files
      if (filename === 'index.js' || filename === 'README.md' || filename === '404.md' ||
          filename === 'tags.js' || filename === 'graph.js') {
        return;
      }

      const tags = postMeta.frontmatter?.tags || [];
      const title = postMeta.frontmatter?.title || filename;
      const url = postMeta.compiledFilename;
      const description = postMeta.frontmatter?.description || postMeta.description || '';
      const related = postMeta.frontmatter?.related || [];

      // Get cluster info - nodeCluster keys include collection prefix
      const nodeId = collection + filename;
      const clusterId = nodeCluster[nodeId] ?? nodeCluster[filename] ?? 0;
      const clusterNodeCount = clusterNodeCounts.get(clusterId) || 1;
      const nodeIndexInCluster = clusterNodeIndices.get(clusterId) || 0;
      clusterNodeIndices.set(clusterId, nodeIndexInCluster + 1);

      // Compute initial position based on cluster
      const position = clusterMeta.length > 0
        ? computeNodePosition(clusterId, clusterMeta, nodeIndexInCluster, clusterNodeCount)
        : { x: undefined, y: undefined };

      const nodeData = {
        id: filename,
        label: truncateTitle(title, 40),
        title: `${title}\n${collectionName}\nTags: ${tags.join(', ')}`,
        url: url,
        fullTitle: title,
        description: description,
        group: collectionGroup,
        tags: tags,
        collection: collectionName,
        related: related,
        cluster: clusterId,
        sentimentColor: postMeta.sentimentColor,
        x: position.x,
        y: position.y,
      };

      nodes.push(nodeData);
      postsByFilename.set(filename, nodeData);
    });
  });

  // Second pass: create edges
  const edgeSet = new Set(); // Track unique edges

  // Use computed relationships if available
  if (relationships && relationships.edges) {
    for (const edge of relationships.edges) {
      // Extract just the filename from the source/target (remove collection prefix)
      const sourceFile = edge.source.replace(/^(the-mirror-room\/|chats\/|notes\/|bookmarks\/)/, '');
      const targetFile = edge.target.replace(/^(the-mirror-room\/|chats\/|notes\/|bookmarks\/)/, '');

      // Check if both nodes exist in our graph
      if (!postsByFilename.has(edge.source) && !postsByFilename.has(sourceFile)) continue;
      if (!postsByFilename.has(edge.target) && !postsByFilename.has(targetFile)) continue;

      const fromId = postsByFilename.has(edge.source) ? edge.source : sourceFile;
      const toId = postsByFilename.has(edge.target) ? edge.target : targetFile;

      const edgeKey = [fromId, toId].sort().join('->');
      if (edgeSet.has(edgeKey)) continue;

      // Style based on edge type
      let edgeStyle = {
        color: '#6b9bd1', // Blue for semantic
        opacity: 0.3 + (edge.score * 0.5),
      };
      let title = `Similarity: ${Math.round(edge.score * 100)}%`;

      if (edge.edgeType === 'explicit') {
        edgeStyle = { color: '#d96a37', opacity: 1 }; // Orange for explicit
        title = 'Explicit link';
      } else if (edge.edgeType === 'inferred') {
        edgeStyle = { color: '#888888', opacity: 0.3 + (edge.score * 0.4) }; // Gray for inferred
        title = `Inferred: ${Math.round(edge.score * 100)}%`;
      }

      edges.push({
        from: fromId,
        to: toId,
        value: Math.round(edge.score * 5),
        score: edge.score,
        color: edgeStyle,
        title: title,
      });
      edgeSet.add(edgeKey);
    }
  } else {
    // Fallback: Manual relationships (strong edges)
    postsByFilename.forEach((post, filename) => {
      post.related.forEach(relatedFilename => {
        if (postsByFilename.has(relatedFilename)) {
          const edgeKey = [filename, relatedFilename].sort().join('->');
          if (!edgeSet.has(edgeKey)) {
            edges.push({
              from: filename,
              to: relatedFilename,
              value: 5, // Thick edge
              color: { color: '#d96a37', opacity: 1 },
              title: 'Manual relationship',
            });
            edgeSet.add(edgeKey);
          }
        }
      });
    });

  }

  const graphData = { nodes, edges };

  return `
<section id="graph-page" class="full-bleed">
  <div id="graph-container"></div>
  <div class="graph-header">
    <div class="graph-controls">
      <div class="graph-search">
        <input type="text" id="graph-search-input" placeholder="Filter by keyword..." autocomplete="off" />
        <span id="graph-search-status"></span>
      </div>
      <div class="graph-slider">
        <label for="graph-threshold">Similarity</label>
        <input type="range" id="graph-threshold" min="0" max="100" value="0" />
        <span id="graph-threshold-value">0%</span>
      </div>
    </div>
  </div>
  <script id="graph-data" type="application/json">
${JSON.stringify(graphData, null, 2)}
  </script>
</section>`;
}

function truncateTitle(title, maxLength) {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3).trim() + '...';
}
// rebuild trigger 1764782480
