// TF-IDF Search Client
(function () {
  'use strict';

  let searchIndex = null;
  let debounceTimer = null;

  // Common English stop words (must match server-side)
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

  // Suffix list for stemming (must match server-side)
  const SUFFIXES = [
    'ingly', 'edly', 'ness', 'ment', 'able', 'ible', 'tion', 'sion',
    'ance', 'ence', 'ally', 'ful', 'ous', 'ive', 'ing', 'ion', 'ity',
    'ies', 'ly', 'ed', 'er', 'es', 's',
  ];

  /**
   * Simple Porter-like stemmer (must match server-side)
   */
  function stem(word) {
    if (word.length < 4) return word;
    for (const suffix of SUFFIXES) {
      if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
        return word.slice(0, -suffix.length);
      }
    }
    return word;
  }

  /**
   * Tokenize query into stemmed terms
   */
  function tokenize(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word))
      .map(stem);
  }

  /**
   * Compute TF-IDF vector for query
   */
  function computeQueryVector(terms) {
    const counts = new Map();
    for (const term of terms) {
      counts.set(term, (counts.get(term) || 0) + 1);
    }

    const totalTerms = terms.length;
    const vector = {};

    for (const [term, count] of counts) {
      const idf = searchIndex.idf[term];
      if (idf !== undefined) {
        const tf = count / totalTerms;
        vector[term] = tf * idf;
      }
    }

    return vector;
  }

  /**
   * Compute cosine similarity between two sparse vectors
   */
  function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    // Compute dot product and norm of A
    for (const term in vecA) {
      const valA = vecA[term];
      normA += valA * valA;
      if (vecB[term] !== undefined) {
        dotProduct += valA * vecB[term];
      }
    }

    // Compute norm of B
    for (const term in vecB) {
      const valB = vecB[term];
      normB += valB * valB;
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Search documents and return ranked results
   */
  function search(query) {
    const terms = tokenize(query);
    if (terms.length === 0) return [];

    const queryVector = computeQueryVector(terms);
    if (Object.keys(queryVector).length === 0) return [];

    const results = [];

    for (const doc of searchIndex.documents) {
      const docVector = searchIndex.tfidf[doc.id];
      if (!docVector) continue;

      const score = cosineSimilarity(queryVector, docVector);
      if (score > 0.01) {
        results.push({ doc, score });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, 20);
  }

  /**
   * Render search results
   */
  function renderResults(results, query) {
    const container = document.getElementById('search-results');
    const status = document.getElementById('search-status');

    if (!query.trim()) {
      container.innerHTML = '';
      status.textContent = '';
      return;
    }

    if (results.length === 0) {
      container.innerHTML = `
        <div class="search-empty">
          <div class="search-empty-icon">~</div>
          <p>No results found for "${escapeHtml(query)}"</p>
        </div>
      `;
      status.textContent = 'No matches';
      return;
    }

    status.textContent = `${results.length} result${results.length === 1 ? '' : 's'}`;

    container.innerHTML = results.map(({ doc, score }) => `
      <article class="search-result">
        <a href="${doc.url}">
          <h2 class="search-result-title">${escapeHtml(doc.title)}</h2>
          <div class="search-result-meta">
            <span class="search-result-collection">${formatCollection(doc.collection)}</span>
            ${doc.date ? `<span class="search-result-date">${doc.date}</span>` : ''}
            <span class="search-result-score">${Math.round(score * 100)}% match</span>
          </div>
          <p class="search-result-description">${escapeHtml(doc.description)}</p>
        </a>
      </article>
    `).join('');
  }

  /**
   * Format collection name for display
   */
  function formatCollection(collection) {
    if (!collection || collection === '') return 'blog';
    return collection.replace(/\/$/, '').replace(/-/g, ' ');
  }

  /**
   * Escape HTML special characters
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Handle search input
   */
  function handleInput(event) {
    const query = event.target.value;

    // Debounce search
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!searchIndex) return;
      const results = search(query);
      renderResults(results, query);
    }, 300);
  }

  /**
   * Initialize search
   */
  async function initSearch() {
    const input = document.getElementById('search-input');
    const status = document.getElementById('search-status');

    if (!input || !status) {
      console.error('Search elements not found');
      return;
    }

    status.textContent = 'Loading search index...';
    status.className = 'loading';

    try {
      const response = await fetch('/search.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      searchIndex = await response.json();

      status.textContent = `${searchIndex.documents.length} posts indexed`;
      status.className = '';

      // Enable input
      input.disabled = false;
      input.addEventListener('input', handleInput);

      // Focus input
      input.focus();

      console.log('Search initialized:', searchIndex.documents.length, 'documents');
    } catch (error) {
      console.error('Failed to load search index:', error);
      status.textContent = 'Failed to load search index';
      status.className = 'error';
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
  } else {
    initSearch();
  }
})();
