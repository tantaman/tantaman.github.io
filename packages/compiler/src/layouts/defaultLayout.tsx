// @ts-nocheck -- jsx hastscript types don't work with hast??
import { select } from 'hast-util-select';
import { h } from 'hastscript';
import { VFile } from 'vfile';
import { indexFrontmatter } from '../index-frontmatter.js';
import fs from 'fs';
import path from 'path';

// Try to load computed relationships
let relationships: any = null;
try {
  const relationshipsPath = path.join(process.cwd(), '.relationships.json');
  const data = fs.readFileSync(relationshipsPath, 'utf8');
  relationships = JSON.parse(data);
} catch (e) {
  // No relationships file, will fall back to tag-based
}

export default async function defaultLayout(tree: ReturnType<typeof h>, file: VFile) {
  const body = select('body', tree);
  if (!body) {
    throw new Error(
      'Body is required to exist before applying the default layout',
    );
  }
  const newChildren = [body.children];
  const matter = file.data.matter;
  const maybeDate = file.basename?.substring(0, 10);
  const isPost = /[0-9]{4}-[0-9]{2}-[0-9]{2}/.exec(maybeDate);
  if (isPost) {
    newChildren.unshift(
      <span class="published subtext">Published {maybeDate}</span>,
    );
  }
  if (matter?.title) {
    newChildren.unshift(<h1>{matter?.title}</h1>);
  }

  // Build related posts footer
  const footerContent = await buildFooter(file);

  const header = isPost ? (
    <header class="post-header">
      <a href="/">tantaman</a>
    </header>
  ) : (
    <header>
      <div class="container">
        <h1>
          <a href="/">Tantaman</a>
        </h1>
        <nav>
          <a href="/blog.html">Blog</a>
          <a href="/stories.html">Stories</a>
          <a href="/chats.html">Chats</a>
          <a href="/tags.html">Tags</a>
          <a href="/graph.html">Graph</a>
          <a href="/search.html">Search</a>
        </nav>
      </div>
    </header>
  );

  body.children = [
    header,
    <main id="static" class={matter?.wide ? 'wide-layout' : undefined}>{newChildren}</main>,
    <footer id="footer">{footerContent}</footer>,
  ];
}

async function buildFooter(file: VFile) {
  const matter = file.data.matter;
  const relatedFilenames = matter?.related || [];
  const currentTags = matter?.tags || [];

  // Get all posts to resolve related filenames to URLs
  const indices = await indexFrontmatter();
  const allPosts: Map<string, { filename: string; title: string; url: string; tags: string[] }> = new Map();

  // Collect all posts
  Object.entries(indices).forEach(([collection, index]) => {
    if (collection === 'bookmarks/' || collection === 'notes/') return;

    Object.entries(index).forEach(([filename, postMeta]) => {
      if (filename === 'index.js' || filename === 'README.md' ||
          filename === '404.md' || filename === 'tags.js' || filename === 'graph.js' ||
          filename === file.basename) return;

      const fullId = collection + filename;
      allPosts.set(fullId, {
        filename,
        title: postMeta.frontmatter?.title || filename,
        url: postMeta.compiledFilename,
        tags: postMeta.frontmatter?.tags || [],
      });
      // Also index by just filename for backward compatibility
      allPosts.set(filename, {
        filename,
        title: postMeta.frontmatter?.title || filename,
        url: postMeta.compiledFilename,
        tags: postMeta.frontmatter?.tags || [],
      });
    });
  });

  const relatedPosts: Array<{ title: string; url: string; source: string }> = [];

  // Try to use computed relationships first
  const currentFileId = file.basename || '';
  const computedRelated = relationships?.posts?.[currentFileId]?.related ||
                          relationships?.posts?.['/' + currentFileId]?.related ||
                          null;

  if (computedRelated && computedRelated.length > 0) {
    // Use computed relationships
    for (const rel of computedRelated.slice(0, 5)) {
      const post = allPosts.get(rel.id) || allPosts.get(rel.id.replace(/^(the-mirror-room\/|chats\/)/, ''));
      if (post) {
        relatedPosts.push({
          title: post.title,
          url: post.url,
          source: rel.type,
        });
      }
    }
  } else {
    // Fallback to manual + tag-based relationships
    // Add manually related posts
    relatedFilenames.forEach((relatedFilename: string) => {
      const post = allPosts.get(relatedFilename);
      if (post) {
        relatedPosts.push({ title: post.title, url: post.url, source: 'manual' });
      }
    });

    // Add tag-based suggestions if we don't have many manual ones
    if (relatedPosts.length < 5 && currentTags.length > 0) {
      const tagBasedPosts = Array.from(allPosts.values())
        .filter(post => post.filename !== file.basename)
        .map(post => {
          const sharedTags = post.tags.filter((tag: string) => currentTags.includes(tag));
          return { ...post, sharedTagCount: sharedTags.length };
        })
        .filter(post => post.sharedTagCount >= 2)
        .sort((a, b) => b.sharedTagCount - a.sharedTagCount)
        .slice(0, 5 - relatedPosts.length);

      for (const post of tagBasedPosts) {
        // Avoid duplicates
        if (!relatedPosts.some(r => r.url === post.url)) {
          relatedPosts.push({ title: post.title, url: post.url, source: 'tags' });
        }
      }
    }
  }

  if (relatedPosts.length === 0 && currentTags.length === 0 && relatedFilenames.length === 0) {
    return null;
  }

  if (relatedPosts.length === 0) {
    return (
      <div class="container related-section">
        <a href="/graph.html" class="view-graph-link">View Content Graph →</a>
      </div>
    );
  }

  return (
    <div class="container related-section">
      <h3 class="related-title">Related Posts</h3>
      <ul class="related-posts-list">
        {relatedPosts.map(post => (
          <li>
            <a href={'/' + post.url}>{post.title}</a>
          </li>
        ))}
      </ul>
      <a href="/graph.html" class="view-graph-link">View Content Graph →</a>
    </div>
  );
}
