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
    const thresholdSlider = document.getElementById('graph-threshold');
    const thresholdLabel = document.getElementById('graph-threshold-value');
    const previewPane = document.getElementById('preview-pane');
    const previewIframe = previewPane?.querySelector('.preview-pane__iframe');
    const previewCollapseBtn = previewPane?.querySelector('.preview-pane__collapse-btn');
    const previewResizeHandle = previewPane?.querySelector('.preview-pane__resize-handle');
    const previewExpandBtn = document.getElementById('preview-pane-expand');
    const breadcrumbs = document.getElementById('breadcrumbs');
    const breadcrumbTrail = breadcrumbs?.querySelector('.breadcrumbs__trail');
    const breadcrumbClear = breadcrumbs?.querySelector('.breadcrumbs__clear');

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

    // Helpers for per-node sentiment colors
    function parseHex(hex) {
      const h = hex.replace('#', '');
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }

    function toHex(r, g, b) {
      return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
    }

    function darken(hex, amount) {
      const [r, g, b] = parseHex(hex);
      const f = 1 - amount;
      return toHex(r * f, g * f, b * f);
    }

    function lighten(hex, amount) {
      const [r, g, b] = parseHex(hex);
      return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
    }

    function sentimentNodeColor(hex) {
      const bg = hex || '#4a90e2';
      return {
        background: bg,
        border: darken(bg, 0.35),
        highlight: { background: lighten(bg, 0.15), border: bg },
      };
    }

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
        color: sentimentNodeColor(node.sentimentColor),
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
          score: edge.score != null ? edge.score : score,
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
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -80,
          centralGravity: 0.005,
          springLength: 150,
          springConstant: 0.02,
          avoidOverlap: 0.5,
        },
        stabilization: {
          enabled: true,
          iterations: 300,
          updateInterval: 25,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        navigationButtons: true,
        keyboard: true,
        zoomSpeed: 0.3,
      },
    };

    // Create network
    const network = new vis.Network(container, { nodes, edges }, options);

    // Parse cluster metadata for boundary drawing
    const clusterInfo = (graphData.clusters || []).filter(c => c.name);

    // Build clusterId -> name map
    const clusterNameMap = new Map();
    clusterInfo.forEach(c => { clusterNameMap.set(c.id, c.name); });

    // Deterministic color per cluster ID using golden angle
    function clusterColor(clusterId, alpha) {
      const hue = (clusterId * 137.5) % 360;
      return `hsla(${hue}, 50%, 55%, ${alpha})`;
    }

    // Draw cluster boundaries and labels on the canvas
    let _dbgCount = 0;
    network.on('beforeDrawing', function (ctx) {
      clusterGeometry = [];

      if (clusterInfo.length === 0) {
        if (_dbgCount++ < 3) console.log('[cluster-dbg] clusterInfo is empty');
        return;
      }

      const positions = network.getPositions();
      const scale = network.getScale();
      const posKeys = Object.keys(positions);

      if (_dbgCount < 3) {
        console.log('[cluster-dbg] clusterInfo:', clusterInfo.length,
          'clusterNameMap keys:', [...clusterNameMap.keys()],
          'positions count:', posKeys.length,
          'scale:', scale);
      }

      // Group visible nodes by cluster
      const clusterPositions = new Map(); // clusterId -> [{x, y}]
      let _skippedHidden = 0, _skippedNoPos = 0, _skippedNoCid = 0, _added = 0;
      nodes.forEach(function (node) {
        if (node.hidden) { _skippedHidden++; return; }
        const pos = positions[node.id];
        if (!pos) { _skippedNoPos++; return; }
        const cid = node.cluster;
        if (cid == null || !clusterNameMap.has(cid)) { _skippedNoCid++; return; }
        if (!clusterPositions.has(cid)) clusterPositions.set(cid, []);
        clusterPositions.get(cid).push(pos);
        _added++;
      });

      if (_dbgCount < 3) {
        console.log('[cluster-dbg] nodes: added=' + _added, 'hidden=' + _skippedHidden,
          'noPos=' + _skippedNoPos, 'noCid=' + _skippedNoCid,
          'clusters with points:', [...clusterPositions.entries()].map(([k,v]) => k + ':' + v.length));
      }
      _dbgCount++;

      clusterPositions.forEach(function (points, cid) {
        if (points.length < 3) return;

        // Compute centroid
        let cx = 0, cy = 0;
        for (const p of points) { cx += p.x; cy += p.y; }
        cx /= points.length;
        cy /= points.length;

        // Compute bounding radius (max distance from centroid + padding)
        let maxR = 0;
        for (const p of points) {
          const d = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
          if (d > maxR) maxR = d;
        }
        const radius = maxR + 60; // padding

        // Draw filled circle
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.fillStyle = clusterColor(cid, 0.08);
        ctx.fill();

        // Draw dashed border
        ctx.setLineDash([8 / scale, 6 / scale]);
        ctx.strokeStyle = clusterColor(cid, 0.4);
        ctx.lineWidth = 1.5 / scale;
        ctx.stroke();
        ctx.setLineDash([]);

        // Store geometry for label drawing in afterDrawing
        clusterGeometry.push({ cid, cx, cy, radius });
      });
    });

    // Draw cluster labels on top of edges and nodes
    network.on('afterDrawing', function (ctx) {
      clusterLabelBounds = [];
      const scale = network.getScale();

      clusterGeometry.forEach(function ({ cid, cx, cy, radius }) {
        const name = clusterNameMap.get(cid);
        if (!name) return;

        const fontSize = 14 / scale;
        const labelY = cy - radius - 8 / scale;
        ctx.font = `bold ${fontSize}px Cormorant Garamond, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        const isSelected = selectedClusterId === cid;
        ctx.fillStyle = isSelected ? clusterColor(cid, 1.0) : clusterColor(cid, 0.85);
        ctx.fillText(name, cx, labelY);

        // Store bounding box for click detection
        const textWidth = ctx.measureText(name).width;
        clusterLabelBounds.push({
          cid,
          x: cx - textWidth / 2,
          y: labelY - fontSize,
          width: textWidth,
          height: fontSize * 1.3,
        });

        // Draw underline for selected cluster
        if (isSelected) {
          ctx.beginPath();
          ctx.moveTo(cx - textWidth / 2, labelY + 2 / scale);
          ctx.lineTo(cx + textWidth / 2, labelY + 2 / scale);
          ctx.strokeStyle = clusterColor(cid, 1.0);
          ctx.lineWidth = 2 / scale;
          ctx.stroke();
        }
      });
    });

    // Track if we're in search filter mode
    let isSearchFiltered = false;
    let currentThreshold = 0;
    let selectedNodeId = null;
    let selectedClusterId = null;
    let clusterLabelBounds = []; // rebuilt each frame in afterDrawing
    let clusterGeometry = []; // rebuilt each frame in beforeDrawing
    let previewCollapsed = false;
    let visitedNodes = []; // array of { id, label } in visit order

    // Function to show all nodes and edges (respecting threshold)
    function showAll() {
      selectedClusterId = null;
      const nodeUpdates = [];
      const edgeUpdates = [];
      nodes.forEach((node) => { nodeUpdates.push({ id: node.id, hidden: false }); });
      edges.forEach((edge) => {
        const belowThreshold = edge.score != null && edge.score < currentThreshold;
        edgeUpdates.push({ id: edge.id, hidden: belowThreshold });
      });
      nodes.update(nodeUpdates);
      edges.update(edgeUpdates);
      isSearchFiltered = false;
    }

    function showPreview(node) {
      if (!previewPane || !node) return;
      if (previewIframe) {
        const newSrc = '/' + node.url;
        if (previewIframe.src !== new URL(newSrc, location.origin).href) {
          previewIframe.src = newSrc;
        }
      }
      if (previewCollapsed) {
        previewPane.classList.add('preview-pane--collapsed');
        previewPane.classList.remove('preview-pane--hidden');
        if (previewExpandBtn) previewExpandBtn.classList.remove('preview-pane-expand--hidden');
      } else {
        previewPane.classList.remove('preview-pane--hidden', 'preview-pane--collapsed');
        if (previewExpandBtn) previewExpandBtn.classList.add('preview-pane-expand--hidden');
      }
    }

    function hidePreview() {
      if (previewPane) previewPane.classList.add('preview-pane--hidden');
      if (previewExpandBtn) previewExpandBtn.classList.add('preview-pane-expand--hidden');
      if (previewIframe) previewIframe.src = 'about:blank';
    }

    function collapsePreview() {
      previewCollapsed = true;
      if (previewPane) previewPane.classList.add('preview-pane--collapsed');
      if (selectedNodeId && previewExpandBtn) {
        previewExpandBtn.classList.remove('preview-pane-expand--hidden');
      }
    }

    function expandPreview() {
      previewCollapsed = false;
      if (selectedNodeId) {
        showPreview(nodes.get(selectedNodeId));
      }
    }

    function addBreadcrumb(node) {
      if (!node) return;
      const entry = { id: node.id, label: node.fullTitle || node.label };
      if (visitedNodes.length > 0 && visitedNodes[visitedNodes.length - 1].id === entry.id) return;
      visitedNodes.push(entry);
      renderBreadcrumbs();
    }

    function renderBreadcrumbs() {
      if (!breadcrumbTrail || !breadcrumbs) return;
      breadcrumbTrail.innerHTML = '';
      if (visitedNodes.length === 0) {
        breadcrumbs.classList.add('breadcrumbs--hidden');
        return;
      }
      breadcrumbs.classList.remove('breadcrumbs--hidden');
      visitedNodes.forEach(function (entry, i) {
        if (i > 0) {
          const sep = document.createElement('span');
          sep.className = 'breadcrumbs__separator';
          sep.textContent = '\u203a';
          breadcrumbTrail.appendChild(sep);
        }
        const btn = document.createElement('button');
        btn.className = 'breadcrumbs__item';
        if (i === visitedNodes.length - 1) btn.classList.add('breadcrumbs__item--active');
        btn.type = 'button';
        const label = entry.label.length > 30 ? entry.label.substring(0, 27) + '...' : entry.label;
        btn.textContent = label;
        btn.title = entry.label;
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          // Truncate forward history
          visitedNodes = visitedNodes.slice(0, i + 1);
          // Select node and filter graph
          selectedClusterId = null;
          selectedNodeId = entry.id;
          var node = nodes.get(entry.id);
          if (!node) return;
          showPreview(node);
          var visibleNeighborIds = new Set();
          var edgeUpdates = [];
          edges.forEach(function (edge) {
            var isConnected = edge.from === entry.id || edge.to === entry.id;
            var belowThreshold = edge.score != null && edge.score < currentThreshold;
            edgeUpdates.push({ id: edge.id, hidden: !isConnected || belowThreshold });
            if (isConnected && !belowThreshold) {
              visibleNeighborIds.add(edge.from === entry.id ? edge.to : edge.from);
            }
          });
          var nodeUpdates = [];
          nodes.forEach(function (n) {
            var isVisible = n.id === entry.id || visibleNeighborIds.has(n.id);
            nodeUpdates.push({ id: n.id, hidden: !isVisible });
          });
          nodes.update(nodeUpdates);
          edges.update(edgeUpdates);
          renderBreadcrumbs();
        });
        breadcrumbTrail.appendChild(btn);
      });
      breadcrumbTrail.scrollLeft = breadcrumbTrail.scrollWidth;
    }

    function clearBreadcrumbs() {
      visitedNodes = [];
      renderBreadcrumbs();
    }

    // Function to filter to a single cluster
    function filterByCluster(cid) {
      const visibleNodes = new Set();
      const nodeUpdates = [];
      nodes.forEach((node) => {
        const visible = node.cluster === cid;
        nodeUpdates.push({ id: node.id, hidden: !visible });
        if (visible) visibleNodes.add(node.id);
      });
      nodes.update(nodeUpdates);

      const edgeUpdates = [];
      edges.forEach((edge) => {
        const bothVisible = visibleNodes.has(edge.from) && visibleNodes.has(edge.to);
        const belowThreshold = edge.score != null && edge.score < currentThreshold;
        edgeUpdates.push({ id: edge.id, hidden: !bothVisible || belowThreshold });
      });
      edges.update(edgeUpdates);
    }

    // Function to filter nodes by search
    function filterBySearch(query) {
      selectedClusterId = null;
      selectedNodeId = null;
      clearBreadcrumbs();
      hidePreview();
      if (!searchIndex) return;

      if (!query.trim()) {
        showAll();
        if (searchStatus) searchStatus.textContent = '';
        return;
      }

      const scores = searchDocuments(query);

      if (scores.size === 0) {
        // No matches - hide all nodes
        const nodeUpdates = [];
        const edgeUpdates = [];
        nodes.forEach((node) => { nodeUpdates.push({ id: node.id, hidden: true }); });
        edges.forEach((edge) => { edgeUpdates.push({ id: edge.id, hidden: true }); });
        nodes.update(nodeUpdates);
        edges.update(edgeUpdates);
        if (searchStatus) searchStatus.textContent = 'No matches';
        isSearchFiltered = true;
        return;
      }

      // Show matching nodes, hide others
      const visibleNodes = new Set();
      const nodeUpdates = [];
      nodes.forEach((node) => {
        // Node ID in graph is just filename, search index has collection + filename
        // Try both formats
        const hasMatch = scores.has(node.id) ||
          [...scores.keys()].some(k => k.endsWith(node.id));

        nodeUpdates.push({ id: node.id, hidden: !hasMatch });
        if (hasMatch) visibleNodes.add(node.id);
      });
      nodes.update(nodeUpdates);

      // Show edges where both endpoints are visible and above threshold
      const edgeUpdates = [];
      edges.forEach((edge) => {
        const bothVisible = visibleNodes.has(edge.from) && visibleNodes.has(edge.to);
        const belowThreshold = edge.score != null && edge.score < currentThreshold;
        edgeUpdates.push({ id: edge.id, hidden: !bothVisible || belowThreshold });
      });
      edges.update(edgeUpdates);

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

        // Clicking the already-selected node: deselect and show all
        if (nodeId === selectedNodeId) {
          selectedNodeId = null;
          showAll();
          hidePreview();
          return;
        }

        selectedClusterId = null;
        selectedNodeId = nodeId;
        addBreadcrumb(nodes.get(nodeId));
        showPreview(nodes.get(nodeId));

        // Collect IDs of neighbors connected by above-threshold edges
        const visibleNeighborIds = new Set();
        const edgeUpdates = [];
        edges.forEach((edge) => {
          const isConnected = edge.from === nodeId || edge.to === nodeId;
          const belowThreshold = edge.score != null && edge.score < currentThreshold;
          edgeUpdates.push({ id: edge.id, hidden: !isConnected || belowThreshold });
          if (isConnected && !belowThreshold) {
            visibleNeighborIds.add(edge.from === nodeId ? edge.to : edge.from);
          }
        });

        const nodeUpdates = [];
        nodes.forEach((node) => {
          const isVisible = node.id === nodeId || visibleNeighborIds.has(node.id);
          nodeUpdates.push({ id: node.id, hidden: !isVisible });
        });
        nodes.update(nodeUpdates);
        edges.update(edgeUpdates);
      } else {
        // No node clicked — check if a cluster label was clicked
        const canvasPos = params.pointer.canvas;
        const hitCluster = clusterLabelBounds.find(b =>
          canvasPos.x >= b.x && canvasPos.x <= b.x + b.width &&
          canvasPos.y >= b.y && canvasPos.y <= b.y + b.height
        );

        if (hitCluster) {
          if (hitCluster.cid === selectedClusterId) {
            // Toggle off
            selectedClusterId = null;
            selectedNodeId = null;
            hidePreview();
            showAll();
          } else {
            // Filter to cluster
            selectedClusterId = hitCluster.cid;
            selectedNodeId = null;
            hidePreview();
            filterByCluster(hitCluster.cid);
          }
          return;
        }

        // Clicked empty space: show all nodes and edges
        if (selectedNodeId != null || selectedClusterId != null) {
          selectedNodeId = null;
          hidePreview();
          showAll();
        }
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

    // Preview pane button handlers
    if (previewCollapseBtn) {
      previewCollapseBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        collapsePreview();
      });
    }
    if (previewExpandBtn) {
      previewExpandBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        expandPreview();
      });
    }

    if (breadcrumbClear) {
      breadcrumbClear.addEventListener('click', function (e) {
        e.stopPropagation();
        clearBreadcrumbs();
      });
    }

    // Preview pane resize handle
    if (previewResizeHandle && previewPane) {
      previewResizeHandle.addEventListener('mousedown', function (e) {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = previewPane.offsetWidth;

        document.body.style.cursor = 'col-resize';
        if (previewIframe) previewIframe.style.pointerEvents = 'none';

        function onMouseMove(e) {
          const delta = startX - e.clientX;
          const newWidth = Math.min(window.innerWidth * 0.8, Math.max(280, startWidth + delta));
          previewPane.style.width = newWidth + 'px';
        }

        function onMouseUp() {
          document.body.style.cursor = '';
          if (previewIframe) previewIframe.style.pointerEvents = '';
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    }

    // Change cursor on hover
    let hoveringNode = false;
    network.on('hoverNode', function () {
      hoveringNode = true;
      container.style.cursor = 'pointer';
    });

    network.on('blurNode', function () {
      hoveringNode = false;
      container.style.cursor = 'default';
    });

    // Change cursor when hovering over cluster labels
    container.addEventListener('mousemove', function (event) {
      if (hoveringNode) return;
      const rect = container.getBoundingClientRect();
      const domPos = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const canvasPos = network.DOMtoCanvas(domPos);
      const overLabel = clusterLabelBounds.some(b =>
        canvasPos.x >= b.x && canvasPos.x <= b.x + b.width &&
        canvasPos.y >= b.y && canvasPos.y <= b.y + b.height
      );
      container.style.cursor = overLabel ? 'pointer' : 'default';
    });

    // After physics stabilizes, freeze layout and fit to view
    network.once('stabilizationIterationsDone', function () {
      network.setOptions({ physics: { enabled: false } });
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

    // Set up threshold slider
    if (thresholdSlider) {
      thresholdSlider.addEventListener('input', function () {
        const value = parseInt(thresholdSlider.value, 10);
        currentThreshold = value / 100;
        if (thresholdLabel) thresholdLabel.textContent = value + '%';

        // Re-apply: if search is active, re-filter; otherwise show all with threshold
        if (isSearchFiltered && searchInput && searchInput.value.trim()) {
          filterBySearch(searchInput.value);
        } else if (selectedNodeId != null) {
          const visibleNeighborIds = new Set();
          const edgeUpdates = [];
          edges.forEach((edge) => {
            const isConnected = edge.from === selectedNodeId || edge.to === selectedNodeId;
            const belowThreshold = edge.score != null && edge.score < currentThreshold;
            edgeUpdates.push({ id: edge.id, hidden: !isConnected || belowThreshold });
            if (isConnected && !belowThreshold) {
              visibleNeighborIds.add(edge.from === selectedNodeId ? edge.to : edge.from);
            }
          });
          const nodeUpdates = [];
          nodes.forEach((node) => {
            const isVisible = node.id === selectedNodeId || visibleNeighborIds.has(node.id);
            nodeUpdates.push({ id: node.id, hidden: !isVisible });
          });
          nodes.update(nodeUpdates);
          edges.update(edgeUpdates);
        } else if (selectedClusterId != null) {
          filterByCluster(selectedClusterId);
        } else {
          // Apply threshold to all edges, keep nodes visible
          const edgeUpdates = [];
          edges.forEach((edge) => {
            const belowThreshold = edge.score != null && edge.score < currentThreshold;
            edgeUpdates.push({ id: edge.id, hidden: belowThreshold });
          });
          edges.update(edgeUpdates);
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
