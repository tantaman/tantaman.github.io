import { tagId, filterPosts, countFacetValues, type Post, type FacetFilters } from './index';

(function () {
  const listContainer = document.getElementById('filtered-posts')!;
  const breadcrumbBar = document.getElementById('breadcrumb-bar')!;
  const sidebar = document.querySelector('.tags-sidebar')!;
  const searchInput = document.getElementById('tags-search-input') as HTMLInputElement | null;
  if (!listContainer || !breadcrumbBar || !sidebar) return;

  // State: active filters per facet + search query
  const state: { subject: Set<string>; concern: Set<string>; form: Set<string>; q: string } = {
    subject: new Set(),
    concern: new Set(),
    form: new Set(),
    q: '',
  };

  function readingTime(wc: number): number {
    return Math.max(1, Math.round((wc || 0) / 200));
  }

  function renderPillsHtml(p: Post): string {
    let pills = '';
    (p.subjects || []).forEach(function (s) {
      pills += '<span class="pill pill-subject">' + esc(s) + '</span>';
    });
    (p.concerns || []).forEach(function (c) {
      pills += '<span class="pill pill-concern">' + esc(c) + '</span>';
    });
    if (p.form) pills += '<span class="pill pill-form">' + esc(p.form) + '</span>';
    return pills ? '<div class="card-pills">' + pills + '</div>' : '';
  }

  function truncateText(str: string, max: number): string {
    if (!str || str.length <= max) return str || '';
    const cut = str.lastIndexOf(' ', max);
    return str.slice(0, cut > 0 ? cut : max) + '\u2026';
  }

  // --- TF-IDF full-text search infrastructure ---

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
    'example', 'like', 'using', 'use', 'used', 'way', 'want', 'get', 'see', 'new',
    'one', 'two', 'first', 'last', 'well', 'much', 'actually', 'really', 'say',
    'said', 'thing', 'things', 'something', 'lot', 'make', 'made', 'going', 'know',
    'think', 'still', 'back', 'take', 'look', 'come', 'since',
  ]);

  const SUFFIXES = [
    'ingly', 'edly', 'ness', 'ment', 'able', 'ible', 'tion', 'sion',
    'ance', 'ence', 'ally', 'ful', 'ous', 'ive', 'ing', 'ion', 'ity',
    'ies', 'ly', 'ed', 'er', 'es', 's',
  ];

  function stem(word: string): string {
    if (word.length < 4) return word;
    for (let i = 0; i < SUFFIXES.length; i++) {
      const suffix = SUFFIXES[i];
      if (word.length - suffix.length >= 3 && word.slice(-suffix.length) === suffix) {
        return word.slice(0, -suffix.length);
      }
    }
    return word;
  }

  function tokenize(text: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(function (w) { return w.length > 2 && !STOP_WORDS.has(w); })
      .map(stem);
  }

  interface SearchIndex {
    idf: Record<string, number>;
    documents: Array<{ id: string; url: string }>;
    tfidf: Record<string, Record<string, number>>;
  }

  function computeQueryVector(terms: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (let i = 0; i < terms.length; i++) {
      counts[terms[i]] = (counts[terms[i]] || 0) + 1;
    }
    const total = terms.length;
    const vector: Record<string, number> = {};
    for (const term in counts) {
      const idf = searchIndex!.idf[term];
      if (idf !== undefined) {
        vector[term] = (counts[term] / total) * idf;
      }
    }
    return vector;
  }

  function cosineSimilarity(vecA: Record<string, number>, vecB: Record<string, number>): number {
    let dot = 0, normA = 0, normB = 0;
    for (const t in vecA) {
      const a = vecA[t];
      normA += a * a;
      if (vecB[t] !== undefined) dot += a * vecB[t];
    }
    for (const t in vecB) {
      const b = vecB[t];
      normB += b * b;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Lazy-loaded search index
  let searchIndex: SearchIndex | null = null;
  let searchIndexLoading = false;
  let searchScores: Record<string, number> = {}; // url -> score

  function loadSearchIndex(): void {
    if (searchIndex || searchIndexLoading) return;
    searchIndexLoading = true;
    fetch('/search.json')
      .then(function (r) { return r.json(); })
      .then(function (data: SearchIndex) {
        searchIndex = data;
        searchIndexLoading = false;
        if (state.q) render();
      })
      .catch(function () { searchIndexLoading = false; });
  }

  function runTfidfSearch(query: string): void {
    searchScores = {};
    const terms = tokenize(query);
    if (terms.length === 0) return;
    const queryVec = computeQueryVector(terms);
    if (Object.keys(queryVec).length === 0) return;
    for (let i = 0; i < searchIndex!.documents.length; i++) {
      const doc = searchIndex!.documents[i];
      const docVec = searchIndex!.tfidf[doc.id];
      if (!docVec) continue;
      const score = cosineSimilarity(queryVec, docVec);
      if (score > 0.01) {
        const url = doc.url.charAt(0) === '/' ? doc.url.slice(1) : doc.url;
        searchScores[url] = score;
      }
    }
  }

  function doFilter(posts: Post[]): Post[] {
    const filters: FacetFilters = {
      subject: state.subject,
      concern: state.concern,
      form: state.form,
    };
    let filtered = filterPosts(posts, filters);

    // TF-IDF full-text search filter
    if (state.q && searchIndex) {
      filtered = filtered.filter((p) => p.url in searchScores);
    }

    return filtered;
  }

  // Posts loaded from manifest
  let posts: Post[] = [];

  function render(): void {
    // Compute TF-IDF scores before filtering
    if (state.q && searchIndex) {
      runTfidfSearch(state.q);
    } else {
      searchScores = {};
    }

    const filtered = doFilter(posts);

    // Sort by relevance when searching, otherwise keep date order
    if (state.q && searchIndex) {
      filtered.sort(function (a, b) {
        return (searchScores[b.url] || 0) - (searchScores[a.url] || 0);
      });
    }

    const counts = countFacetValues(filtered);

    // Update breadcrumb bar
    const crumbs: string[] = [];
    (['subject', 'concern', 'form'] as const).forEach(function (facet) {
      state[facet].forEach(function (val) {
        const btn = sidebar!.querySelector('.tag-tab[data-facet="' + facet + '"][data-value="' + val + '"]');
        const label = btn ? btn.childNodes[0].textContent!.trim() : val;
        crumbs.push('<button class="crumb" data-facet="' + facet + '" data-value="' + val + '">' + esc(label) + ' \u00d7</button>');
      });
    });
    const countText = filtered.length + ' post' + (filtered.length !== 1 ? 's' : '');
    if (crumbs.length > 0) {
      breadcrumbBar.innerHTML = crumbs.join('') + '<span class="result-count">' + countText + '</span>';
      breadcrumbBar.classList.add('has-crumbs');
    } else {
      breadcrumbBar.innerHTML = '<span class="result-count">' + countText + '</span>';
      breadcrumbBar.classList.remove('has-crumbs');
    }

    // Update post list
    if (filtered.length === 0) {
      listContainer.innerHTML = '<p style="color:var(--text-muted)">No posts match the selected filters.</p>';
    } else {
      let html = '<ul class="tag-posts">';
      filtered.forEach(function (p) {
        const mins = readingTime(p.wordCount || 0);
        const score = searchScores[p.url];
        const matchText = score ? ' &middot; ' + Math.round(score * 100) + '% match' : '';
        html += '<li class="tag-post"><a href="' + p.url + '">';
        if (p.sentimentColor) html += '<div class="sentiment-strip" style="background:' + p.sentimentColor + '"></div>';
        html += '<div class="tag-post-body">';
        if (p.image) html += '<img class="tag-post-thumb" src="' + p.image + '" alt="" loading="lazy" />';
        html += '<div class="tag-post-info">';
        html += '<span class="post-title">' + esc(p.title) + '</span>';
        html += '<div class="subtext">' + p.date + ' &middot; ' + mins + ' min' + matchText + '</div>';
        html += renderPillsHtml(p);
        if (p.description) html += '<span class="post-description">' + esc(truncateText(p.description, 300)) + '</span>';
        html += '</div></div></a></li>';
      });
      html += '</ul>';
      listContainer.innerHTML = html;
    }

    // Update button states, counts, and fill bars
    const groups = sidebar!.querySelectorAll('.facet-group');
    for (let g = 0; g < groups.length; g++) {
      const group = groups[g];
      const facet = group.getAttribute('data-facet') as keyof typeof counts;
      const facetCounts = counts[facet] || {};
      const buttons = group.querySelectorAll('.tag-tab');

      let maxInGroup = 0;
      for (let i = 0; i < buttons.length; i++) {
        const val = buttons[i].getAttribute('data-value')!;
        const c = facetCounts[val] || 0;
        if (c > maxInGroup) maxInGroup = c;
      }

      for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i] as HTMLElement;
        const value = btn.getAttribute('data-value')!;
        const isActive = state[facet] && state[facet].has(value);
        const count = facetCounts[value] || 0;

        btn.classList.toggle('active', isActive);

        const countEl = btn.querySelector('.tag-count');
        if (countEl) countEl.textContent = String(count);

        const fill = maxInGroup > 0 ? Math.round((count / maxInGroup) * 100) : 0;
        btn.style.setProperty('--fill', fill + '%');
      }
    }
  }

  function esc(s: string): string {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // Breadcrumb click to remove filter
  breadcrumbBar.addEventListener('click', function (e) {
    const crumb = (e.target as HTMLElement).closest('.crumb');
    if (!crumb) return;

    const facet = crumb.getAttribute('data-facet') as 'subject' | 'concern' | 'form';
    const value = crumb.getAttribute('data-value')!;
    if (state[facet]) {
      state[facet].delete(value);
      render();
      updateHash();
    }
  });

  // Search input with debounce + lazy index loading
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      if (searchTimer) clearTimeout(searchTimer);
      const val = searchInput!.value.trim().toLowerCase();
      if (val && !searchIndex && !searchIndexLoading) {
        loadSearchIndex();
      }
      searchTimer = setTimeout(function () {
        state.q = val;
        render();
        updateHash();
      }, 150);
    });
  }

  // Event delegation for button clicks
  sidebar.addEventListener('click', function (e) {
    const btn = (e.target as HTMLElement).closest('.tag-tab');
    if (!btn) return;

    const facet = btn.getAttribute('data-facet') as 'subject' | 'concern' | 'form';
    const value = btn.getAttribute('data-value')!;
    if (!state[facet]) return;

    if (state[facet].has(value)) {
      state[facet].delete(value);
    } else {
      state[facet].add(value);
    }

    render();
    updateHash();

    // On mobile, scroll the tapped pill into view
    if (window.innerWidth <= 768) {
      (btn as HTMLElement).scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  });

  // URL hash sync
  function parseHash(): void {
    state.subject = new Set();
    state.concern = new Set();
    state.form = new Set();
    state.q = '';

    const hash = location.hash.slice(1);
    if (!hash) return;

    hash.split('&').forEach(function (part) {
      const eq = part.indexOf('=');
      if (eq === -1) return;
      const key = decodeURIComponent(part.slice(0, eq)) as 'subject' | 'concern' | 'form' | 'q';
      const val = decodeURIComponent(part.slice(eq + 1));
      if (key === 'q') {
        state.q = val.toLowerCase();
      } else if (state[key]) {
        val.split(',').filter(Boolean).forEach(function (v) { (state[key] as Set<string>).add(v); });
      }
    });

    if (searchInput) searchInput.value = state.q;
  }

  function updateHash(): void {
    const parts: string[] = [];
    (['subject', 'concern', 'form'] as const).forEach(function (facet) {
      if (state[facet].size > 0) {
        parts.push(facet + '=' + Array.from(state[facet]).join(','));
      }
    });
    if (state.q) {
      parts.push('q=' + encodeURIComponent(state.q));
    }
    const newHash = parts.length > 0 ? '#' + parts.join('&') : '';
    if (newHash !== location.hash && !(newHash === '' && location.hash === '')) {
      history.replaceState(null, '', newHash || location.pathname);
    }
  }

  window.addEventListener('hashchange', function () {
    parseHash();
    render();
  });

  // Init: fetch manifest, parse hash, render
  fetch('/posts-manifest.json')
    .then(function (r) { return r.json(); })
    .then(function (data: any[]) {
      // Map manifest format to Post format
      posts = data.map(function (p) {
        return {
          title: p.title,
          url: p.slug.includes('.') ? p.slug : p.slug + '.html',
          date: p.date,
          description: p.summary || '',
          subjects: p.tags || [],
          concerns: p.concern || [],
          form: p.form || 'essay',
          image: undefined,
          sentimentColor: p.color || '',
          wordCount: p.wordCount || 0,
        } as Post;
      });

      parseHash();
      if (state.q) loadSearchIndex();
      render();
    });
})();
