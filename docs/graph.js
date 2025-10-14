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
        // Store metadata for click handling
        url: node.url,
        fullTitle: node.fullTitle,
        description: node.description,
      }))
    );

    // Process edges
    const edges = new vis.DataSet(
      graphData.edges.map(edge => ({
        from: edge.from,
        to: edge.to,
        value: edge.value,
        color: edge.color,
        title: edge.title,
        smooth: {
          type: 'continuous',
          roundness: 0.5,
        },
      }))
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
        stabilization: {
          iterations: 200,
          updateInterval: 25,
        },
        barnesHut: {
          gravitationalConstant: -8000,
          centralGravity: 0.3,
          springLength: 150,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.1,
        },
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

    // Handle node clicks - navigate to post
    network.on('click', function(params) {
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
