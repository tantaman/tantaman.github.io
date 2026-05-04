// @ts-nocheck
import React from 'https://esm.sh/react';
import TodoList from './TodoList.js';
import LwwStateTable from './LwwStateTable.js';
import { injectStyle } from '../shared/injectStyle.js';
import { CSS } from './styles.js';

const nodeNames = ['A', 'B', 'C'];

async function syncLeftToRight(l, r) {
  const lChanges = await l.execA('SELECT * FROM crsql_changes');
  await r.tx(async (tx) => {
    for (const change of lChanges) {
      await tx.execA(
        'INSERT INTO crsql_changes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        change,
      );
    }
  });
}

export default function Lww({ lwwCtxts }) {
  injectStyle('lww-vs-dag', CSS);
  const [syncing, setSyncing] = React.useState(false);
  const ctxts = lwwCtxts;
  const syncNodes = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncLeftToRight(ctxts[0].db, ctxts[1].db);
      await syncLeftToRight(ctxts[1].db, ctxts[2].db);
      await syncLeftToRight(ctxts[2].db, ctxts[1].db);
      await syncLeftToRight(ctxts[1].db, ctxts[0].db);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <center>
        <h2>LWW State Example</h2>
      </center>
      <div style={{ display: 'flex', height: 400, overflowY: 'scroll' }}>
        {ctxts.map((ctx, i) => (
          <section className="lwd-todoapp" key={i}>
            <div style={{ background: 'white' }}>
              <TodoList
                ctx={ctx}
                nodeName={nodeNames[i]}
                eventHandler={processLocalEvent}
                ex="lww"
              />
            </div>
          </section>
        ))}
      </div>
      <div>
        <center>
          <button className="lwd-btn" disabled={syncing} onClick={syncNodes}>
            Sync Nodes &#128259;
          </button>
        </center>
      </div>
      <div style={{ display: 'flex' }}>
        {ctxts.map((ctx, i) => (
          <section className="lwd-todoapp" key={i}>
            <LwwStateTable ctx={ctx} />
          </section>
        ))}
      </div>
    </div>
  );
}

async function processLocalEvent(ctx, event) {
  switch (event.type) {
    case 'add':
      await ctx.db.exec(
        'INSERT INTO todo (id, "text", completed) VALUES (?, ?, ?)',
        [event.itemId, event.value || '', 0],
      );
      break;
    case 'remove':
      await ctx.db.exec('DELETE FROM todo WHERE id = ?', [event.itemId]);
      break;
    case 'complete':
      await ctx.db.exec('UPDATE todo SET completed = ? WHERE id = ?', [
        event.value,
        event.itemId,
      ]);
      break;
    case 'rename':
      await ctx.db.exec('UPDATE todo SET "text" = ? WHERE id = ?', [
        event.value,
        event.itemId,
      ]);
      break;
    case 'completeAll':
      await ctx.db.exec(
        `UPDATE todo SET completed = true WHERE completed = false`,
      );
      break;
    case 'uncompleteAll':
      await ctx.db.exec(
        `UPDATE todo SET completed = false WHERE completed = true`,
      );
      break;
    case 'clearCompleted':
      await ctx.db.exec(`DELETE FROM todo WHERE completed = true`);
      break;
  }
}
