// Graph visualization using vis-network with TF-IDF search
(function () {
  'use strict';

  let searchIndex = null;
  let debounceTimer = null;

  // Common English stop words (must match search.js)
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

  // Suffix list for stemming (must match search.js)
  const SUFFIXES = [
    'ingly', 'edly', 'ness', 'ment', 'able', 'ible', 'tion', 'sion',
    'ance', 'ence', 'ally', 'ful', 'ous', 'ive', 'ing', 'ion', 'ity',
    'ies', 'ly', 'ed', 'er', 'es', 's',
  ];

  function stem(word) {
    if (word.length < 4) return word;
    for (const suffix of SUFFIXES) {
      if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
        return word.slice(0, -suffix.length);
      }
    }
    return word;
  }

  function tokenize(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word))
      .map(stem);
  }

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

  function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const term in vecA) {
      const valA = vecA[term];
      normA += valA * valA;
      if (vecB[term] !== undefined) {
        dotProduct += valA * vecB[term];
      }
    }

    for (const term in vecB) {
      const valB = vecB[term];
      normB += valB * valB;
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  function searchDocuments(query) {
    const terms = tokenize(query);
    if (terms.length === 0) return new Map();

    const queryVector = computeQueryVector(terms);
    if (Object.keys(queryVector).length === 0) return new Map();

    const scores = new Map();

    for (const doc of searchIndex.documents) {
      const docVector = searchIndex.tfidf[doc.id];
      if (!docVector) continue;

      const score = cosineSimilarity(queryVector, docVector);
      if (score > 0.01) {
        scores.set(doc.id, score);
      }
    }

    return scores;
  }

  // Wait for DOM and vis library to be ready
  function initGraph() {
    if (typeof vis === 'undefined') {
      console.error('vis-network library not loaded');
      return;
    }

    const container = document.getElementById('graph-container');
    const dataElement = document.getElementById('graph-data');
    const searchInput = document.getElementById('graph-search-input');
    const searchStatus = document.getElementById('graph-search-status');

    if (!container || !dataElement) {
      console.error('Graph container or data not found');
      return;
    }

    // Parse graph data
    let graphData;
    try {
      graphData = JSON.parse(dataElement.textContent);
    } catch (e) {
      console.error('Failed to parse graph data:', e);
      return;
    }

    // Configure node colors by group
    const nodeColors = {
      1: {
        background: '#4a90e2',
        border: '#2e5f99',
        highlight: { background: '#5ba3ff', border: '#4a90e2' },
      }, // blog
      2: {
        background: '#9b59b6',
        border: '#6c3483',
        highlight: { background: '#b370cf', border: '#9b59b6' },
      }, // stories
      3: {
        background: '#e67e22',
        border: '#a85a1a',
        highlight: { background: '#ff9138', border: '#e67e22' },
      }, // chats
    };

    // Build a map for cluster lookup
    const nodeClusterMap = new Map();
    graphData.nodes.forEach((node) => {
      nodeClusterMap.set(node.id, node.cluster);
    });

    // Process nodes
    const nodes = new vis.DataSet(
      graphData.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        title: node.title,
        group: node.group,
        color: nodeColors[node.group],
        font: {
          color: '#fcebd5',
          size: 14,
          face: 'Cormorant Garamond',
          mod: 'bold',
          strokeWidth: 3,
          strokeColor: '#000000',
        },
        // Pre-seeded positions from cluster layout
        x: node.x,
        y: node.y,
        // Store metadata for click handling
        url: node.url,
        fullTitle: node.fullTitle,
        description: node.description,
        cluster: node.cluster,
      })),
    );

    // Build adjacency map for quick neighbor lookup
    const adjacencyMap = new Map();
    graphData.edges.forEach((edge) => {
      if (!adjacencyMap.has(edge.from)) adjacencyMap.set(edge.from, new Set());
      if (!adjacencyMap.has(edge.to)) adjacencyMap.set(edge.to, new Set());
      adjacencyMap.get(edge.from).add(edge.to);
      adjacencyMap.get(edge.to).add(edge.from);
    });

    // Color gradient: green (weak) -> blue (medium) -> red (strong)
    function scoreToColor(score, alpha) {
      // Hue: 120 (green) -> 240 (blue) -> 360 (red)
      const hue = 120 + score * 240;
      return `hsla(${hue}, 70%, 50%, ${alpha})`;
    }

    // Process edges: color gradient shows strength, uniform thin width
    const edges = new vis.DataSet(
      graphData.edges.map((edge) => {
        const fromCluster = nodeClusterMap.get(edge.from);
        const toCluster = nodeClusterMap.get(edge.to);
        const isCrossCluster = fromCluster !== toCluster;

        // Score was stored as value * 5, so normalize back to 0-1
        const score = (edge.value || 1) / 5;
        const alpha = isCrossCluster ? 0.15 : 0.7;

        return {
          from: edge.from,
          to: edge.to,
          width: 1 + score * 3, // 1px to 4px based on strength
          color: scoreToColor(score, alpha),
          title: edge.title,
          smooth: isCrossCluster
            ? { type: 'curvedCW', roundness: 0.15 }
            : { type: 'continuous', roundness: 0.5 },
        };
      }),
    );

    // Network options
    const options = {
      nodes: {
        shape: 'dot',
        size: 16,
        borderWidth: 2,
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.5)',
          size: 10,
          x: 0,
          y: 0,
        },
      },
      edges: {
        width: 1,
        smooth: {
          enabled: true,
          type: 'continuous',
        },
        shadow: false,
      },
      physics: {
        enabled: false, // Rely entirely on pre-computed cluster positions
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        navigationButtons: true,
        keyboard: true,
      },
    };

    // Create network
    const network = new vis.Network(container, { nodes, edges }, options);

    // Track if we're in search filter mode
    let isSearchFiltered = false;

    // Function to show all nodes and edges
    function showAll() {
      nodes.forEach((node) => {
        nodes.update({ id: node.id, hidden: false });
      });
      edges.forEach((edge) => {
        edges.update({ id: edge.id, hidden: false });
      });
      isSearchFiltered = false;
    }

    // Function to filter nodes by search
    function filterBySearch(query) {
      if (!searchIndex) return;

      if (!query.trim()) {
        showAll();
        if (searchStatus) searchStatus.textContent = '';
        return;
      }

      const scores = searchDocuments(query);

      if (scores.size === 0) {
        // No matches - hide all nodes
        nodes.forEach((node) => {
          nodes.update({ id: node.id, hidden: true });
        });
        edges.forEach((edge) => {
          edges.update({ id: edge.id, hidden: true });
        });
        if (searchStatus) searchStatus.textContent = 'No matches';
        isSearchFiltered = true;
        return;
      }

      // Show matching nodes, hide others
      const visibleNodes = new Set();
      nodes.forEach((node) => {
        // Node ID in graph is just filename, search index has collection + filename
        // Try both formats
        const hasMatch = scores.has(node.id) ||
          [...scores.keys()].some(k => k.endsWith(node.id));

        nodes.update({ id: node.id, hidden: !hasMatch });
        if (hasMatch) visibleNodes.add(node.id);
      });

      // Show edges where both endpoints are visible
      edges.forEach((edge) => {
        const bothVisible = visibleNodes.has(edge.from) && visibleNodes.has(edge.to);
        edges.update({ id: edge.id, hidden: !bothVisible });
      });

      if (searchStatus) {
        searchStatus.textContent = `${visibleNodes.size} match${visibleNodes.size === 1 ? '' : 'es'}`;
      }
      isSearchFiltered = true;
    }

    // Single click: show only clicked node and its connections (if not search filtered)
    network.on('click', function (params) {
      // If search is active, don't do click filtering
      if (isSearchFiltered) return;

      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const connectedIds = adjacencyMap.get(nodeId) || new Set();

        // Hide unconnected nodes
        nodes.forEach((node) => {
          const isConnected = node.id === nodeId || connectedIds.has(node.id);
          nodes.update({
            id: node.id,
            hidden: !isConnected,
          });
        });

        // Hide unconnected edges
        edges.forEach((edge) => {
          const isConnected = edge.from === nodeId || edge.to === nodeId;
          edges.update({
            id: edge.id,
            hidden: !isConnected,
          });
        });
      } else {
        // Clicked empty space: show all nodes and edges
        showAll();
      }
    });

    // Double click: navigate to post
    network.on('doubleClick', function (params) {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = nodes.get(nodeId);
        if (node && node.url) {
          window.location.href = '/' + node.url;
        }
      }
    });

    // Change cursor on hover
    network.on('hoverNode', function () {
      container.style.cursor = 'pointer';
    });

    network.on('blurNode', function () {
      container.style.cursor = 'default';
    });

    // Fit network when stabilized
    network.once('stabilizationIterationsDone', function () {
      network.fit({
        animation: {
          duration: 1000,
          easingFunction: 'easeInOutQuad',
        },
      });
    });

    // Set up search input handler
    if (searchInput) {
      searchInput.addEventListener('input', function (event) {
        const query = event.target.value;

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          filterBySearch(query);
        }, 300);
      });

      // Clear search on Escape
      searchInput.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          searchInput.value = '';
          showAll();
          if (searchStatus) searchStatus.textContent = '';
        }
      });
    }

    // Load search index
    fetch('/search.json')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => {
        searchIndex = data;
        if (searchInput) searchInput.disabled = false;
        console.log('Search index loaded:', searchIndex.documents.length, 'documents');
      })
      .catch(error => {
        console.error('Failed to load search index:', error);
        if (searchStatus) {
          searchStatus.textContent = 'Search unavailable';
          searchStatus.style.color = '#e74c3c';
        }
      });

    console.log(
      'Graph initialized with',
      nodes.length,
      'nodes and',
      edges.length,
      'edges',
    );
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGraph);
  } else {
    initGraph();
  }
})();
