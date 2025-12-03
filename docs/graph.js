// Graph visualization using vis-network
(function() {
  'use strict';

  // Wait for DOM and vis library to be ready
  function initGraph() {
    if (typeof vis === 'undefined') {
      console.error('vis-network library not loaded');
      return;
    }

    const container = document.getElementById('graph-container');
    const dataElement = document.getElementById('graph-data');

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
      1: { background: '#4a90e2', border: '#2e5f99', highlight: { background: '#5ba3ff', border: '#4a90e2' } }, // blog
      2: { background: '#9b59b6', border: '#6c3483', highlight: { background: '#b370cf', border: '#9b59b6' } }, // stories
      3: { background: '#e67e22', border: '#a85a1a', highlight: { background: '#ff9138', border: '#e67e22' } }, // chats
    };

    // Build a map for cluster lookup
    const nodeClusterMap = new Map();
    graphData.nodes.forEach(node => {
      nodeClusterMap.set(node.id, node.cluster);
    });

    // Process nodes
    const nodes = new vis.DataSet(
      graphData.nodes.map(node => ({
        id: node.id,
        label: node.label,
        title: node.title,
        group: node.group,
        color: nodeColors[node.group],
        font: {
          color: '#fcebd5',
          size: 14,
          face: 'Cormorant Garamond',
        },
        // Pre-seeded positions from cluster layout
        x: node.x,
        y: node.y,
        // Store metadata for click handling
        url: node.url,
        fullTitle: node.fullTitle,
        description: node.description,
        cluster: node.cluster,
      }))
    );

    // Build adjacency map for quick neighbor lookup
    const adjacencyMap = new Map();
    graphData.edges.forEach(edge => {
      if (!adjacencyMap.has(edge.from)) adjacencyMap.set(edge.from, new Set());
      if (!adjacencyMap.has(edge.to)) adjacencyMap.set(edge.to, new Set());
      adjacencyMap.get(edge.from).add(edge.to);
      adjacencyMap.get(edge.to).add(edge.from);
    });

    // Color gradient: green (weak) → blue (medium) → red (strong)
    function scoreToColor(score) {
      // Hue: 120 (green) → 240 (blue) → 360 (red)
      const hue = 120 + (score * 240);
      return `hsl(${hue}, 70%, 50%)`;
    }

    // Process edges: color gradient shows strength, uniform thin width
    const edges = new vis.DataSet(
      graphData.edges.map(edge => {
        const fromCluster = nodeClusterMap.get(edge.from);
        const toCluster = nodeClusterMap.get(edge.to);
        const isCrossCluster = fromCluster !== toCluster;

        // Score was stored as value * 5, so normalize back to 0-1
        const score = (edge.value || 1) / 5;

        return {
          from: edge.from,
          to: edge.to,
          width: 1,  // Fixed thin width
          color: {
            color: scoreToColor(score),
            opacity: isCrossCluster ? 0.25 : 0.8,
          },
          title: edge.title,
          smooth: isCrossCluster
            ? { type: 'curvedCW', roundness: 0.15 }
            : { type: 'continuous', roundness: 0.5 },
        };
      })
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
        enabled: false,  // Rely entirely on pre-computed cluster positions
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

    // Single click: show only clicked node and its connections
    network.on('click', function(params) {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const connectedIds = adjacencyMap.get(nodeId) || new Set();

        // Hide unconnected nodes
        nodes.forEach(node => {
          const isConnected = node.id === nodeId || connectedIds.has(node.id);
          nodes.update({
            id: node.id,
            hidden: !isConnected,
          });
        });

        // Hide unconnected edges
        edges.forEach(edge => {
          const isConnected = edge.from === nodeId || edge.to === nodeId;
          edges.update({
            id: edge.id,
            hidden: !isConnected,
          });
        });
      } else {
        // Clicked empty space: show all nodes and edges
        nodes.forEach(node => {
          nodes.update({ id: node.id, hidden: false });
        });
        edges.forEach(edge => {
          edges.update({ id: edge.id, hidden: false });
        });
      }
    });

    // Double click: navigate to post
    network.on('doubleClick', function(params) {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = nodes.get(nodeId);
        if (node && node.url) {
          window.location.href = '/' + node.url;
        }
      }
    });

    // Change cursor on hover
    network.on('hoverNode', function() {
      container.style.cursor = 'pointer';
    });

    network.on('blurNode', function() {
      container.style.cursor = 'default';
    });

    // Fit network when stabilized
    network.once('stabilizationIterationsDone', function() {
      network.fit({
        animation: {
          duration: 1000,
          easingFunction: 'easeInOutQuad',
        },
      });
    });

    console.log('Graph initialized with', nodes.length, 'nodes and', edges.length, 'edges');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGraph);
  } else {
    initGraph();
  }
})();
