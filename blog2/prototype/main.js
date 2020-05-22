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

function htmlToElement(html) {
  const template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
	template.innerHTML = html;
  return template.content.firstChild;
}

function makeNav() {
	const textFill = '#CCCCCC';
	const textHighlightFill = 'orange';
	const reader = d3.dagStratify();
	const dag = reader(data);

	const layout = d3.sugiyama()
		.size([window.innerWidth - 60, window.innerHeight - 60])
		.layering(d3.layeringLongestPath())
		.decross(d3.decrossOpt())
		.coord(d3.coordCenter());

	// This code only handles rendering
  const nodeRadius = 20;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const svgNode = htmlToElement(`<svg width=${width} height=${height} viewbox="${-nodeRadius} ${-nodeRadius} ${width + 2 * nodeRadius} ${height + 2 * nodeRadius}"></svg>`)
  document.getElementById('nav').append(svgNode);
  
  const svgSelection = d3.select(svgNode);
  const defs = svgSelection.append('defs');
  defs
    .append('marker')
    .attr("id", "arrow")
    .attr("refX", 6)
    .attr("refY", 6)
    .attr("markerWidth", 30)
    .attr("markerHeight", 30)
    .attr("markerUnits","userSpaceOnUse")
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 0 0 12 6 0 12 3 6")
    .style("fill", "#666666");
    
  
  // Use computed layout
  layout(dag);
  
  const steps = dag.size();
  const interp = d3.interpolateRgb('#666666', '#AAAAAA');
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
    .attr('d', ({ data }) => {
    	const [start, end] = data.points;
    	// Should technically shift the X as well so we retain
    	// the original slop of the line.
    	return line([start, {x: end.x, y: end.y - 10}]);
    })
    .attr('fill', 'none')
    .attr('stroke-width', 2)
    .attr('stroke', '#666666')
    .attr('marker-end', 'url(#arrow)');
  
  // Select nodes
  const nodes = svgSelection.append('g')
    .selectAll('g')
    .data(dag.descendants())
    .enter()
    .append('g')
    .attr('transform', ({x, y}) => `translate(${x}, ${y})`);
  
  // Plot node circles
  // nodes.append('circle')
  //   .attr('r', 20)
  //   .attr('fill', n => colorMap[n.id]);

  function onTextMouseOver() {
  	d3.select(this).attr('fill', textHighlightFill);
  }

  function onTextMouseOut() {
  	d3.select(this).attr('fill', textFill);	
  }

  // Add text to nodes
  nodes.append('text')
    .text(d => d.id)
    .attr('class', 'node-label')
    .attr('font-weight', 'bold')
    .attr('font-family', 'sans-serif')
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'middle')
    .attr('fill', textFill)
    .attr('fill-opacity', 1)
    .attr('stroke', '#000000')
    .attr('stroke-width', 0.5)
    .attr('stroke-opacity', 1)
    .on('mouseover', onTextMouseOver)
    .on('mouseout', onTextMouseOut)
}

makeNav();