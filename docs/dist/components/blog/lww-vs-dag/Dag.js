// @ts-nocheck
import React from 'https://esm.sh/react';
import DagStateGraph from './DagStateGraph.js';
import TodoList from './TodoList.js';
import { newIID } from './id.js';
import EventTable from './EventTable.js';
import { injectStyle } from '../shared/injectStyle.js';
import { CSS } from './styles.js';
const nodeNames = ['A', 'B', 'C'];
async function syncLeftToRight(l, r) {
    const lChanges = await l.execA('SELECT * FROM crsql_changes');
    await r.tx(async (tx) => {
        for (const change of lChanges) {
            await tx.execA('INSERT INTO crsql_changes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', change);
        }
    });
}
export default function Dag({ dagCtxts }) {
    injectStyle('lww-vs-dag', CSS);
    const ctxts = dagCtxts;
    const [syncing, setSyncing] = React.useState(false);
    const syncNodes = async () => {
        if (syncing)
            return;
        setSyncing(true);
        try {
            await syncLeftToRight(ctxts[0].db, ctxts[1].db);
            await syncLeftToRight(ctxts[1].db, ctxts[2].db);
            await syncLeftToRight(ctxts[2].db, ctxts[1].db);
            await syncLeftToRight(ctxts[1].db, ctxts[0].db);
            await Promise.all(ctxts.map(processDAG));
        }
        finally {
            setSyncing(false);
        }
    };
    const resetState = async () => {
        if (syncing)
            return;
        setSyncing(true);
        try {
            await Promise.all(ctxts.map(async (ctx) => {
                await ctx.db.execA('DELETE FROM todo WHERE 1');
                await ctx.db.execA('DELETE FROM event');
                await ctx.db.execA('DELETE FROM event_dag');
                await ctx.db.execA('DELETE FROM event__crsql_clock');
                await ctx.db.execA('DELETE FROM event_dag__crsql_clock');
            }));
        }
        finally {
            setSyncing(false);
        }
    };
    return (React.createElement("div", null,
        React.createElement("center", null,
            React.createElement("h2", null, "DAG State Example")),
        React.createElement("p", null,
            "Rather than just keeping the final state as is done with LWW, the DAG example keeps a record of every event. These events are linked together into a \"causal graph\" to represent which events caused which others. Processing the graph gives us the final state.",
            React.createElement("br", null),
            React.createElement("br", null),
            "In the examples below you can add todos to different lists and sync all the lists. The causal graphs for each node are depicted below the lists."),
        React.createElement("div", { style: { display: 'flex', height: 350, overflowY: 'scroll' } }, ctxts.map((ctx, i) => (React.createElement("section", { className: "lwd-todoapp", key: i },
            React.createElement("div", { style: { background: 'white' } },
                React.createElement(TodoList, { ctx: ctx, nodeName: nodeNames[i], eventHandler: processNewEvent, ex: "dag" })))))),
        React.createElement("div", null,
            React.createElement("center", null,
                React.createElement("button", { className: "lwd-btn", disabled: syncing, onClick: syncNodes }, "Sync Nodes \uD83D\uDD03"),
                React.createElement("button", { className: "lwd-btn lwd-btn-secondary", disabled: syncing, onClick: resetState }, "Reset"))),
        React.createElement("div", { style: { display: 'flex' } }, ctxts.map((ctx, i) => (React.createElement("section", { className: "lwd-todoapp", key: i },
            React.createElement(DagStateGraph, { ctx: ctx, nodeName: nodeNames[i] }))))),
        React.createElement("div", { style: { display: 'flex' } }, ctxts.map((ctx, i) => (React.createElement("section", { className: "lwd-todoapp", key: i },
            React.createElement(EventTable, { ctx: ctx, nodeName: nodeNames[i] })))))));
}
async function processDAG(ctx) {
    const dag = await ctx.db.execA(pullDagQuery);
    for (const [, itemId, type, value] of dag) {
        await processEvent(ctx.db, ctx.db.siteid, { itemId, type, value });
    }
}
async function processNewEvent(ctx, event) {
    await ctx.db.tx(async (tx) => {
        let parents = await tx.execA(leavesQuery);
        if (parents.length == 0)
            parents = [['ROOT']];
        const eventId = await processEvent(tx, ctx.db.siteid, event);
        await tx.exec(`INSERT INTO event VALUES (?, ?, ?, ?)`, [
            eventId,
            event.itemId,
            event.type,
            event.value,
        ]);
        for (const parent of parents) {
            await tx.execA('INSERT OR IGNORE INTO event_dag VALUES (?, ?, 0)', [
                parent[0],
                eventId,
            ]);
        }
    });
}
async function processEvent(tx, siteid, event) {
    const eventId = newIID(siteid.replaceAll('-', ''));
    switch (event.type) {
        case 'add':
            await tx.exec(`INSERT INTO todo (id, "text", completed) VALUES (?, ?, ?)
        ON CONFLICT DO UPDATE SET "text" = excluded."text", completed = excluded.completed`, [event.itemId, event.value || '', 0]);
            break;
        case 'remove':
            await tx.exec('DELETE FROM todo WHERE id = ?', [event.itemId]);
            break;
        case 'complete':
            await tx.exec('UPDATE todo SET completed = ? WHERE id = ?', [
                event.value,
                event.itemId,
            ]);
            break;
        case 'rename':
            await tx.exec('UPDATE todo SET "text" = ? WHERE id = ?', [
                event.value,
                event.itemId,
            ]);
            break;
        case 'completeAll':
            await tx.exec(`UPDATE todo SET completed = true WHERE completed = false`);
            break;
        case 'uncompleteAll':
            await tx.exec(`UPDATE todo SET completed = false WHERE completed = true`);
            break;
        case 'clearCompleted':
            await tx.exec(`DELETE FROM todo WHERE completed = true`);
            break;
    }
    return eventId;
}
const leavesQuery = `SELECT l.event_id
  FROM event_dag as l
  WHERE NOT EXISTS (SELECT NULL FROM event_dag as r WHERE r.parent_id = l.event_id)`;
const pullDagQuery = `WITH RECURSIVE
after_node(event_id,level) AS (
  VALUES('ROOT',0)
  UNION ALL
  SELECT event_dag.event_id, after_node.level+1
    FROM event_dag JOIN after_node ON event_dag.parent_id=after_node.event_id
   ORDER BY 2,1 DESC
)

SELECT DISTINCT event.id, event.item_id, event.type, event.value
  FROM after_node JOIN event
  ON after_node.event_id = event.id;
`;
