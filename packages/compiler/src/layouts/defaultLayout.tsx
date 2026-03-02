// @ts-nocheck -- jsx hastscript types don't work with hast??
import { select } from 'hast-util-select';
import { h } from 'hastscript';
import { VFile } from 'vfile';
import { indexFrontmatter } from '../index-frontmatter.js';
import { hashAsset } from '../hash-asset.js';
import { renderAuthorLogosHast } from '../author-logos.js';
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

export default async function defaultLayout(
  tree: ReturnType<typeof h>,
  file: VFile,
) {
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

  // Derive slug for comments (filename minus extension)
  const slug = file.basename?.replace(/\.(md|mdx|html)$/, '') || '';
  const commentsEnabled = isPost && matter?.comments !== false;

  if (isPost) {
    const authorLogos = renderAuthorLogosHast(matter?.author);
    newChildren.unshift(
      h('span', { class: 'published subtext' }, [
        { type: 'text', value: `Published ${maybeDate}` },
        authorLogos,
      ]),
    );
  }

  // Engagement strip goes after published date, before body
  if (commentsEnabled) {
    newChildren.splice(isPost ? 1 : 0, 0, <div id="engagement-strip" data-slug={slug}></div>);
  }

  // Audio player for posts with audio: true
  if (matter?.audio) {
    newChildren.splice(newChildren.length - 1, 0,
      <div class="audio-player">
        <audio controls preload="none">
          <source src={`/audio/${slug}.mp3`} type="audio/mpeg" />
        </audio>
      </div>
    );
  }

  if (matter?.title) {
    newChildren.unshift(<h1>{matter?.title}</h1>);
  }

  // Build related posts footer
  const footerContent = await buildFooter(file);

  const header = matter?.noHeader ? null : isPost || matter?.minimalHeader ? (
    <header class="post-header">
      <a href="/">tantaman</a>
      <div class="post-header-actions">
        <div id="notification-jewel"></div>
        <button class="theme-toggle" type="button"></button>
      </div>
    </header>
  ) : (
    <header>
      <div class="container">
        <h1>
          <a href="/">Tantaman</a>
        </h1>
        <nav>
          <a href="/tags.html">Browse</a>
          <a href="/graph.html">Graph</a>
          <a href="/thoughts/">Thoughts</a>
          <div id="notification-jewel"></div>
          <div class="settings-menu">
            <button class="settings-menu-btn" type="button" aria-label="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            <div class="settings-menu-dropdown">
              <a href="/pages/mcp.html">MCP</a>
              <button class="theme-toggle" type="button"></button>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );

  body.children = [
    header,
    <main id="static" class={matter?.wide ? 'wide-layout' : undefined}>
      {newChildren}
    </main>,
    commentsEnabled ? <section id="comments-section" data-slug={slug}></section> : null,
    matter?.noHeader ? null : <footer id="footer">{footerContent}</footer>,
  ].filter(Boolean);

  // Inject comments CSS and JS unconditionally (needed for notification jewel)
  const head = select('head', tree);
  if (head) {
    head.children.push(
      h('link', { rel: 'stylesheet', href: hashAsset('/comments/comments.css') }),
    );
  }
  body.children.push(
    h('script', { src: hashAsset('/comments/comments.js'), defer: true, type: 'module' }),
  );
}

async function buildFooter(file: VFile) {
  const matter = file.data.matter;
  const relatedFilenames = matter?.related || [];
  const currentTags = matter?.tags || [];

  // Get all posts to resolve related filenames to URLs
  const indices = await indexFrontmatter();
  const allPosts: Map<
    string,
    { filename: string; title: string; url: string; tags: string[] }
  > = new Map();

  // Collect all posts
  Object.entries(indices).forEach(([collection, index]) => {
    if (collection === 'bookmarks/' || collection === 'notes/' || collection === 'pages/') return;

    Object.entries(index).forEach(([filename, postMeta]) => {
      if (
        filename === 'index.js' ||
        filename === 'README.md' ||
        filename === '404.md' ||
        filename === 'tags.js' ||
        filename === 'graph.js' ||
        filename === file.basename
      )
        return;

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

  const relatedPosts: Array<{ title: string; url: string; source: string }> =
    [];

  // Try to use computed relationships first
  const currentFileId = file.basename || '';
  const computedRelated =
    relationships?.posts?.[currentFileId]?.related ||
    relationships?.posts?.['/' + currentFileId]?.related ||
    null;

  if (computedRelated && computedRelated.length > 0) {
    // Use computed relationships
    for (const rel of computedRelated.slice(0, 5)) {
      const post =
        allPosts.get(rel.id) ||
        allPosts.get(rel.id.replace(/^(the-mirror-room\/|chats\/)/, ''));
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
        relatedPosts.push({
          title: post.title,
          url: post.url,
          source: 'manual',
        });
      }
    });

    // Add tag-based suggestions if we don't have many manual ones
    if (relatedPosts.length < 5 && currentTags.length > 0) {
      const tagBasedPosts = Array.from(allPosts.values())
        .filter((post) => post.filename !== file.basename)
        .map((post) => {
          const sharedTags = post.tags.filter((tag: string) =>
            currentTags.includes(tag),
          );
          return { ...post, sharedTagCount: sharedTags.length };
        })
        .filter((post) => post.sharedTagCount >= 2)
        .sort((a, b) => b.sharedTagCount - a.sharedTagCount)
        .slice(0, 5 - relatedPosts.length);

      for (const post of tagBasedPosts) {
        // Avoid duplicates
        if (!relatedPosts.some((r) => r.url === post.url)) {
          relatedPosts.push({
            title: post.title,
            url: post.url,
            source: 'tags',
          });
        }
      }
    }
  }

  if (
    relatedPosts.length === 0 &&
    currentTags.length === 0 &&
    relatedFilenames.length === 0
  ) {
    return null;
  }

  if (relatedPosts.length === 0) {
    return (
      <div class="container related-section">
        <a href="/graph.html" class="view-graph-link">
          View Content Graph →
        </a>
      </div>
    );
  }

  return (
    <div class="container related-section">
      <h3 class="related-title">Related Posts</h3>
      <ul class="related-posts-list">
        {relatedPosts.map((post) => (
          <li>
            <a href={'/' + post.url}>{post.title}</a>
          </li>
        ))}
      </ul>
      <a href="/graph.html" class="view-graph-link">
        View Content Graph →
      </a>
    </div>
  );
}
