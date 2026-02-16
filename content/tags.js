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

export default async function tags(file, cwd, files) {
  return {
    content: async () => {
      const result = await unified()
        .use(rehypeParse)
        .use(rehypeDocument, {
          ...doc,
          css: doc.css.concat(['/tags.css']),
          js: doc.js.concat(['/tags-browse.js']),
          title: 'Browse',
        })
        .use(rehypeMeta, {
          ...meta,
          title: 'Browse - Tantamanlands',
          description: 'Explore posts by subject, concern, and form',
        })
        .use(layout)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(await tagsPage());

      return result.toString();
    },
    frontmatter: {
      title: 'Browse',
      description: 'Explore posts by subject, concern, and form',
    },
    greymatter: {},
  };
}

async function tagsPage() {
  const indices = await indexFrontmatter();

  // Collect all posts with their facet data
  const allPosts = [];

  Object.entries(indices).forEach(([collection, index]) => {
    if (collection === 'bookmarks/' || collection === 'notes/') return;

    Object.entries(index).forEach(([key, postMeta]) => {
      if (key === 'index.js' || key === 'README.md' || key === '404.md' || key === 'tags.js') return;
      if (key === 'index.md' || key === 'audio.md' || key === 'scratch.md') return;

      const fm = postMeta.frontmatter || {};
      if (fm.draft) return;

      const title = fm.title || key;
      const url = postMeta.compiledFilename;
      const description = fm.description || postMeta.description || '';
      const date = fm.date
        ? String(fm.date).substring(0, 10)
        : extractDate(postMeta.compiledFilename);
      const subjects = fm.tags || [];
      const concerns = fm.concern || [];

      // Form detection: explicit > collection inference > default
      let form = fm.form;
      if (!form) {
        if (collection === 'the-mirror-room/') form = 'story';
        else if (collection === 'chats/') form = 'chat';
        else if (fm.standalone === 'html') form = 'interactive';
        else form = 'essay';
      }

      allPosts.push({ title, url, description, date, subjects, concerns, form });
    });
  });

  // Sort by date descending
  allPosts.sort((a, b) => b.date.localeCompare(a.date));

  // Collect facet values with counts
  const subjectCounts = new Map();
  const concernCounts = new Map();
  const formCounts = new Map();

  allPosts.forEach(post => {
    post.subjects.forEach(s => subjectCounts.set(s, (subjectCounts.get(s) || 0) + 1));
    post.concerns.forEach(c => concernCounts.set(c, (concernCounts.get(c) || 0) + 1));
    formCounts.set(post.form, (formCounts.get(post.form) || 0) + 1);
  });

  // Sort facet values by count descending
  const sortedSubjects = sortFacet(subjectCounts);
  const sortedConcerns = sortFacet(concernCounts);
  const sortedForms = sortFacet(formCounts);

  // Generate sidebar HTML
  const sidebar = `
    <nav class="tags-sidebar" aria-label="Filters">
      ${facetGroup('Subject', sortedSubjects, 'subject')}
      ${facetGroup('Concern', sortedConcerns, 'concern')}
      ${facetGroup('Form', sortedForms, 'form')}
    </nav>`;

  // Generate no-JS fallback panels (grouped by subject)
  const tagMap = new Map();
  allPosts.forEach(post => {
    post.subjects.forEach(s => {
      if (!tagMap.has(s)) tagMap.set(s, []);
      tagMap.get(s).push(post);
    });
  });

  const fallbackPanels = sortedSubjects.map(([subject], i) => {
    const posts = tagMap.get(subject) || [];
    const id = tagId(subject);
    return `
    <div class="tag-panel" id="panel-${id}" data-tag="${id}">
      <h3 class="panel-title">${subject}</h3>
      <ul class="tag-posts">
        ${posts.map(post => postItem(post)).join('')}
      </ul>
    </div>`;
  }).join('');

  // Embed JSON data for client-side filtering
  const postsJson = JSON.stringify(allPosts.map(p => ({
    title: p.title,
    url: p.url,
    date: p.date,
    description: truncate(stripTags(p.description), 120),
    subjects: p.subjects,
    concerns: p.concerns,
    form: p.form,
  })));

  return `
<script type="application/json" id="posts-data">${postsJson}</script>
<section id="tags-page" class="wide">
  ${sidebar}
  <div class="tags-panels">
    <div class="result-count">${allPosts.length} posts</div>
    <div id="filtered-posts">
      <ul class="tag-posts">
        ${allPosts.map(post => postItem(post)).join('')}
      </ul>
    </div>
    <noscript>
      ${fallbackPanels}
    </noscript>
  </div>
</section>`;
}

function facetGroup(label, sortedEntries, facetName) {
  if (sortedEntries.length === 0) return '';
  const maxCount = sortedEntries[0][1];
  return `
      <div class="facet-group" data-facet="${facetName}">
        <div class="facet-label">${label}</div>
        ${sortedEntries.map(([value, count]) => {
          const fill = Math.round((count / maxCount) * 100);
          const id = tagId(value);
          return `<button class="tag-tab" data-facet="${facetName}" data-value="${id}" style="--fill: ${fill}%">${value} <span class="tag-count">${count}</span></button>`;
        }).join('\n        ')}
      </div>`;
}

function postItem(post) {
  return `
        <li class="tag-post">
          <a href="${post.url}">
            <span class="post-title">${post.title}</span>
            ${post.date ? `<span class="post-date">${post.date}</span>` : ''}
            ${post.description ? `<span class="post-description">${truncate(stripTags(post.description), 120)}</span>` : ''}
          </a>
        </li>`;
}

function sortFacet(countMap) {
  return Array.from(countMap.entries())
    .sort((a, b) => {
      const countDiff = b[1] - a[1];
      if (countDiff !== 0) return countDiff;
      return a[0].localeCompare(b[0]);
    });
}

function tagId(tag) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractDate(filename) {
  const basename = filename.includes('/') ? filename.split('/').pop() : filename;
  const candidate = basename.substring(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : '';
}

function truncate(text, length) {
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + '...';
}

function stripTags(html) {
  return (html || '').replace(/<[^>]*>/g, '');
}
