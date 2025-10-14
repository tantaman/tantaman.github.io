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
        .use(layout)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(await graphPage());

      return result.toString();
    },
    frontmatter: {
      title: 'Content Graph',
      description: 'Explore connections between posts, stories, and chats',
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
      };

      nodes.push(nodeData);
      postsByFilename.set(filename, nodeData);
    });
  });

  // Second pass: create edges
  const edgeSet = new Set(); // Track unique edges

  // 1. Manual relationships (strong edges)
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

  // 2. Tag-based relationships (weak edges)
  const posts = Array.from(postsByFilename.values());
  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      const post1 = posts[i];
      const post2 = posts[j];

      const sharedTags = post1.tags.filter(tag => post2.tags.includes(tag));

      if (sharedTags.length >= 2) {
        const edgeKey = [post1.id, post2.id].sort().join('->');
        if (!edgeSet.has(edgeKey)) {
          edges.push({
            from: post1.id,
            to: post2.id,
            value: sharedTags.length,
            color: { color: '#d96a37', opacity: 0.3 + (sharedTags.length * 0.1) },
            title: `Shared tags: ${sharedTags.join(', ')}`,
          });
          edgeSet.add(edgeKey);
        }
      }
    }
  }

  const graphData = { nodes, edges };

  return `
<section id="graph-page">
  <div class="graph-header">
    <h1 class="page-title">Content Graph</h1>
    <p class="page-description">Explore connections between posts, stories, and chats. Click nodes to navigate.</p>
    <div class="graph-legend">
      <div class="legend-item">
        <span class="legend-color blog-color"></span>
        <span>Blog Posts</span>
      </div>
      <div class="legend-item">
        <span class="legend-color stories-color"></span>
        <span>Stories</span>
      </div>
      <div class="legend-item">
        <span class="legend-color chats-color"></span>
        <span>Chats</span>
      </div>
      <div class="legend-item">
        <span class="legend-line strong-edge"></span>
        <span>Manual relation</span>
      </div>
      <div class="legend-item">
        <span class="legend-line weak-edge"></span>
        <span>Tag similarity</span>
      </div>
    </div>
  </div>
  <div id="graph-container"></div>
  <script id="graph-data" type="application/json">
${JSON.stringify(graphData, null, 2)}
  </script>
</section>`;
}

function truncateTitle(title, maxLength) {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3).trim() + '...';
}
