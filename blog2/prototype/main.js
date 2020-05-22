const d3Dag = require('d3-dag');
const d3Base = require('d3');
const d3 = {...d3Dag, ...d3Base};

const data = [
	{
		id: 'Blog',
	}, {
		id: 'Philosophy',
		parentIds: ['Blog'],
	}, {
		id: 'Religion',
		parentIds: ['Blog'],
	}, {
		id: 'Theology',
		parentIds: ['Religion', 'Philosophy'],
	}, {
		id: 'Language',
		parentIds: ['Blog'],
	}, {
		id: 'Types',
		parentIds: ['Language', 'SoftwareDevelopment'],
	}, {
		id: 'SoftwareDevelopment',
		parentIds: ['Blog'],
	}, {
		id: 'Programming',
		parentIds: ['SoftwareDevelopment', 'Language'],
	}
];

function makeNav() {
	const reader = d3.dagStratify();
	const dag = reader(data);

	const layout = d3.sugiyama()
		.size([window.innerWidth - 60, window.innerHeight - 60])
		.layering(d3.layeringLongestPath())
		.decross(d3.decrossOpt())
		.coord(d3.coordCenter());

	// This code only handles rendering
  const nodeRadius = 20;
  const svgNode = document.getElementById('nav');
  
  const svgSelection = d3.select(svgNode);
  const defs = svgSelection.append('defs'); // For gradients
  
  // Use computed layout
  layout(dag);
  
  const steps = dag.size();
  const interp = d3.interpolateRainbow;
  const colorMap = {};
  dag.each((node, i) => {
    colorMap[node.id] = interp(i / steps);
  });
  
  // How to draw edges
  const line = d3.line()
    .curve(d3.curveCatmullRom)
    .x(d => d.x)
    .y(d => d.y);
    
  // Plot edges
  svgSelection.append('g')
    .selectAll('path')
    .data(dag.links())
    .enter()
    .append('path')
    .attr('d', ({ data }) => line(data.points))
    .attr('fill', 'none')
    .attr('stroke-width', 3)
    .attr('stroke', ({source, target}) => {
      const gradId = `${source.id}-${target.id}`;
      const grad = defs.append('linearGradient')
        .attr('id', gradId)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', source.x)
        .attr('x2', target.x)
        .attr('y1', source.y)
        .attr('y2', target.y);
      grad.append('stop').attr('offset', '0%').attr('stop-color', colorMap[source.id]);
      grad.append('stop').attr('offset', '100%').attr('stop-color', colorMap[target.id]);
      return `url(#${gradId})`;
    });
  
  // Select nodes
  const nodes = svgSelection.append('g')
    .selectAll('g')
    .data(dag.descendants())
    .enter()
    .append('g')
    .attr('transform', ({x, y}) => `translate(${x}, ${y})`);
  
  // Plot node circles
  nodes.append('circle')
    .attr('r', 20)
    .attr('fill', n => colorMap[n.id]);

  // Add text to nodes
  nodes.append('text')
    .text(d => d.id)
    .attr('font-weight', 'bold')
    .attr('font-family', 'sans-serif')
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'middle')
    .attr('fill', 'white');
}

makeNav();