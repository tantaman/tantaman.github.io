// @ts-nocheck
import React from 'https://esm.sh/react';
import { useQuery } from 'https://esm.sh/@vlcn.io/react?deps=react,react-dom';
import cytoscape from 'https://esm.sh/cytoscape';
import dagre from 'https://esm.sh/cytoscape-dagre';
import nodeHtmlLabel from 'https://esm.sh/cytoscape-node-html-label';

cytoscape.use(dagre);
nodeHtmlLabel(cytoscape);

export default function DagStateGraph({ ctx, nodeName }) {
  const chart = useQuery(
    ctx,
    `SELECT
      event_dag.parent_id as parentId,
      event_dag.event_id as eventId,
      event.mutation_name as mutationName,
      event.args as args
    FROM event_dag
    JOIN event ON event.id = event_dag.event_id`,
    [],
    (rows) => {
      const nodes = [{ data: { id: 'ROOT', label: 'ROOT' } }];
      const edges = [];
      for (const row of rows) {
        nodes.push({
          data: {
            id: row.eventId.toString(),
            label: `${row.mutationName}<br/>${row.args}`,
          },
        });
        if (row.parentId) {
          edges.push({
            data: {
              source: row.parentId.toString(),
              target: row.eventId.toString(),
            },
          });
        }
      }
      return { nodes, edges };
    },
  ).data;

  const [cy, setCy] = React.useState(null);
  const root = React.useRef(null);

  React.useEffect(() => {
    if (!root.current) return;

    const aCy = cytoscape({
      container: root.current,
      elements: chart,
      boxSelectionEnabled: false,
      autounselectify: true,
      layout: { name: 'dagre' },
      style: [
        { selector: 'node', style: { 'background-color': '#11479e' } },
        {
          selector: 'edge',
          style: {
            width: 4,
            'target-arrow-shape': 'triangle',
            'line-color': '#9dbaea',
            'target-arrow-color': '#9dbaea',
            'curve-style': 'bezier',
          },
        },
      ],
    });
    aCy.nodeHtmlLabel([
      {
        query: 'node',
        halign: 'center',
        valign: 'center',
        halignBox: 'center',
        valignBox: 'center',
        cssClass: 'byo-dag-label',
        tpl(data) {
          return '<span>' + data.label + '</span>';
        },
      },
    ]);
    setCy(aCy);
  }, [root.current]);

  React.useEffect(() => {
    if (!cy) return;
    cy.elements().remove();
    cy.add(chart);
    cy.layout({ name: 'dagre' }).run();
    cy.center();
    cy.fit();
  }, [cy, chart]);

  return (
    <>
      <h2>DAG - {nodeName}</h2>
      <div
        style={{
          width: 425,
          height: 500,
          position: 'relative',
          background: 'black',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
          }}
        ></div>
        <div
          ref={(el) => {
            root.current = el;
          }}
          style={{ width: 425, height: 500 }}
        ></div>
      </div>
    </>
  );
}
