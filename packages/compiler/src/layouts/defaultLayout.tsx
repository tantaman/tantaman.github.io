// @ts-nocheck -- jsx hastscript types don't work with hast??
import { select } from 'hast-util-select';
import { h } from 'hastscript';
import { VFile } from 'vfile';
import { indexFrontmatter } from '../index-frontmatter.js';

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
  if (/[0-9]{4}-[0-9]{2}-[0-9]{2}/.exec(maybeDate)) {
    newChildren.unshift(
      <span class="published subtext">Published {maybeDate}</span>,
    );
  }
  if (matter?.title) {
    newChildren.unshift(<h1>{matter?.title}</h1>);
  }

  // Build related posts footer
  const footerContent = await buildFooter(file);

  body.children = [
    <header>
      <div class="container">
        <h1>
          <a href="/">Tantaman</a>
        </h1>
        <nav>
          <a href="/#blog">Blog</a>
          <a href="/#stories">Stories</a>
          <a href="/#chats">Chats</a>
          <a href="/tags.html">Tags</a>
          <a href="/graph.html">Graph</a>
          {/* <a href="/#notes">Notes</a> */}
          {/* <a href="/#synthesis">Synthesis</a> */}
          {/* <a href="/#about">About</a> */}
        </nav>
      </div>
    </header>,
    <main id="static">{newChildren}</main>,
    <footer id="footer">{footerContent}</footer>,
  ];
}

async function buildFooter(file: VFile) {
  const matter = file.data.matter;
  const relatedFilenames = matter?.related || [];
  const currentTags = matter?.tags || [];

  if (relatedFilenames.length === 0 && currentTags.length === 0) {
    return null;
  }

  // Get all posts to resolve related filenames to URLs and find tag-based suggestions
  const indices = await indexFrontmatter();
  const relatedPosts = [];
  const allPosts = [];

  // Collect all posts
  Object.entries(indices).forEach(([collection, index]) => {
    if (collection === 'bookmarks/' || collection === 'notes/') return;

    Object.entries(index).forEach(([filename, postMeta]) => {
      if (filename === 'index.js' || filename === 'README.md' ||
          filename === '404.md' || filename === 'tags.js' || filename === 'graph.js' ||
          filename === file.basename) return;

      allPosts.push({
        filename,
        title: postMeta.frontmatter?.title || filename,
        url: postMeta.compiledFilename,
        tags: postMeta.frontmatter?.tags || [],
      });
    });
  });

  // Add manually related posts
  relatedFilenames.forEach(relatedFilename => {
    const post = allPosts.find(p => p.filename === relatedFilename);
    if (post) {
      relatedPosts.push({ ...post, source: 'manual' });
    }
  });

  // Add tag-based suggestions if we don't have many manual ones
  if (relatedPosts.length < 5 && currentTags.length > 0) {
    const tagBasedPosts = allPosts
      .map(post => {
        const sharedTags = post.tags.filter(tag => currentTags.includes(tag));
        return { ...post, sharedTags, source: 'tags' };
      })
      .filter(post => post.sharedTags.length >= 2)
      .sort((a, b) => b.sharedTags.length - a.sharedTags.length)
      .slice(0, 5 - relatedPosts.length);

    relatedPosts.push(...tagBasedPosts);
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
