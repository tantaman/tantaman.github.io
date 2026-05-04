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
export default function Dag({ ctxts }) {
    injectStyle('bring-your-own-crdt', CSS);
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
                await ctx.db.execA('DELETE FROM todo');
                await ctx.db.execA('UPDATE counter SET count = 0');
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
        React.createElement("div", { style: { display: 'flex', height: 350, overflowY: 'scroll' } }, ctxts.map((ctx, i) => (React.createElement("section", { className: "byo-todoapp", key: i },
            React.createElement("div", { style: { background: 'white' } },
                React.createElement(TodoList, { ctx: ctx, nodeName: nodeNames[i], eventHandler: processNewEvent, ex: "dag" })))))),
        React.createElement("div", null,
            React.createElement("center", null,
                React.createElement("button", { className: "byo-btn", disabled: syncing, onClick: syncNodes }, "Sync Nodes \uD83D\uDD03"),
                React.createElement("button", { className: "byo-btn byo-btn-secondary", disabled: syncing, onClick: resetState }, "Reset"))),
        React.createElement("div", { style: { display: 'flex' } }, ctxts.map((ctx, i) => (React.createElement("section", { className: "byo-todoapp", key: i },
            React.createElement(DagStateGraph, { ctx: ctx, nodeName: nodeNames[i] }))))),
        React.createElement("div", { style: { display: 'flex' } }, ctxts.map((ctx, i) => (React.createElement("section", { className: "byo-todoapp", key: i },
            React.createElement(EventTable, { ctx: ctx, nodeName: nodeNames[i] })))))));
}
const bareMutations = {
    async add(tx, todoId, content) {
        await tx.exec(`INSERT INTO todo (id, content, completed) VALUES (?, ?, ?)`, [todoId, content, 0]);
    },
    async remove(tx, todoId) {
        await tx.exec(`DELETE FROM todo WHERE id = ?`, [todoId]);
    },
    async complete(tx, todoId, complete) {
        await tx.exec(`UPDATE todo SET completed = ? WHERE id = ?`, [
            complete,
            todoId,
        ]);
    },
    async rename(tx, todoId, content) {
        await tx.exec(`UPDATE todo SET content = ? WHERE id = ?`, [content, todoId]);
    },
    async completeAll(tx) {
        await tx.exec(`UPDATE todo SET completed = 1 WHERE completed = 0`);
    },
    async uncompleteAll(tx) {
        await tx.exec(`UPDATE todo SET completed = 0 WHERE completed = 1`);
    },
    async clearCompleted(tx) {
        await tx.exec(`DELETE FROM todo WHERE completed = 1`);
    },
    async increment(tx) {
        var _a;
        const current = ((_a = (await tx.execA(`SELECT count FROM counter`))[0]) === null || _a === void 0 ? void 0 : _a[0]) || 0;
        await tx.exec(`INSERT OR REPLACE INTO counter (id, count) VALUES (0, ?)`, [
            current + 1,
        ]);
    },
};
const trackedMutations = asTrackedMutations(bareMutations);
function asTrackedMutations(mutations) {
    const result = {};
    for (const [name, fn] of Object.entries(mutations)) {
        result[name] = async function (tx, ...args) {
            let parents = await tx.execA(`SELECT l.event_id FROM event_dag as l WHERE NOT EXISTS (SELECT NULL FROM event_dag as r WHERE r.parent_id = l.event_id)`);
            if (parents.length == 0)
                parents = [['ROOT']];
            await fn(tx, ...args);
            const eventId = newIID(tx.siteid);
            await tx.exec(`INSERT INTO event (id, mutation_name, args) VALUES (?, ?, ?)`, [eventId, name, JSON.stringify(args)]);
            for (const parent of parents) {
                try {
                    await tx.execA(`INSERT OR IGNORE INTO event_dag VALUES (?, ?)`, [
                        parent[0],
                        eventId,
                    ]);
                }
                catch (e) {
                    console.log(e);
                }
            }
        };
    }
    return result;
}
async function processDAG(ctx) {
    await ctx.db.tx(async (tx) => {
        const dag = await tx.execA(pullDagQuery);
        await tx.exec(`DELETE FROM todo`);
        await tx.exec(`UPDATE counter SET count = 0`);
        for (const [, mutationName, args] of dag) {
            await processEvent(tx, ctx.db.siteid, mutationName, args);
        }
    });
}
async function processNewEvent(ctx, event) {
    await ctx.db.tx(async (tx) => {
        tx.siteid = ctx.db.siteid;
        const mutation = trackedMutations[event.name];
        await mutation(tx, ...event.args);
    });
}
async function processEvent(tx, siteid, mutationName, args) {
    const mutation = bareMutations[mutationName];
    tx.siteid = siteid;
    await mutation(tx, ...JSON.parse(args));
}
const pullDagQuery = `WITH RECURSIVE
after_node(event_id,level) AS (
  VALUES('ROOT',0)
  UNION ALL
  SELECT event_dag.event_id, after_node.level+1
    FROM event_dag JOIN after_node ON event_dag.parent_id=after_node.event_id
   ORDER BY 2,1 DESC
)

SELECT DISTINCT event.id, event.mutation_name, event.args
  FROM after_node JOIN event
  ON after_node.event_id = event.id;
`;
