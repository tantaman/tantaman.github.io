// @ts-nocheck
import React, { useEffect, useState } from 'https://esm.sh/react';
import sqliteWasm from 'https://esm.sh/@vlcn.io/crsqlite-wasm';
import tblrx from 'https://esm.sh/@vlcn.io/rx-tbl';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@vlcn.io/crsqlite-wasm/dist/crsqlite.wasm';
export default function Initialize({ Comp }) {
    const [ctxts, setCtxts] = useState(null);
    useEffect(() => {
        if (window.__lwwvsdagctxs) {
            window.__lwwvsdagctxs.then((newCtxts) => {
                if (ctxts != null)
                    return;
                setCtxts(newCtxts);
            });
        }
        else {
            window.__lwwvsdagctxs = init();
            window.__lwwvsdagctxs.then((newCtxts) => {
                if (ctxts != null)
                    return;
                setCtxts(newCtxts);
            });
        }
    }, [ctxts]);
    if (ctxts == null)
        return React.createElement("div", null, "Loading...");
    return React.createElement(Comp, Object.assign({}, ctxts));
}
async function init() {
    const sqlite = await sqliteWasm(() => WASM_URL);
    const createCtx = async (db) => {
        await createSchema(db);
        const rx = await tblrx(db);
        return { db, rx };
    };
    const createDagCtx = async (db) => {
        await createDagSchema(db);
        const rx = await tblrx(db);
        return { db, rx };
    };
    const lwwCtxts = await Promise.all([
        await sqlite.open(':memory:'),
        await sqlite.open(':memory:'),
        await sqlite.open(':memory:'),
    ].map(createCtx));
    const dagCtxts = await Promise.all([
        await sqlite.open(':memory:'),
        await sqlite.open(':memory:'),
        await sqlite.open(':memory:'),
    ].map(createDagCtx));
    return { lwwCtxts, dagCtxts };
}
async function createSchema(db) {
    await db.exec('CREATE TABLE todo (id INTEGER PRIMARY KEY NOT NULL, "text" TEXT, completed INTEGER);');
    await db.exec("SELECT crsql_as_crr('todo');");
}
async function createDagSchema(db) {
    await db.tx(async (tx) => {
        await tx.exec('CREATE TABLE todo (id INTEGER PRIMARY KEY NOT NULL, "text" TEXT, completed INTEGER);');
        await tx.exec('CREATE TABLE event (id INTEGER PRIMARY KEY NOT NULL, item_id INTEGER, [type] TEXT, value ANY);');
        await tx.exec('CREATE INDEX event_item ON event (item_id);');
        await tx.exec(`CREATE TABLE event_dag (
      parent_id ANY NOT NULL,
      event_id INTEGER NOT NULL,
      foo ANY,
      PRIMARY KEY (parent_id, event_id)
    ) STRICT;`);
        await tx.exec(`CREATE INDEX event_dag_event ON event_dag (event_id);`);
        await tx.exec("SELECT crsql_as_crr('event');");
        await tx.exec("SELECT crsql_as_crr('event_dag');");
    });
}
