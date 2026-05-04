// @ts-nocheck
import React, { useEffect, useState } from 'https://esm.sh/react';
import sqliteWasm from 'https://esm.sh/@vlcn.io/crsqlite-wasm';
import tblrx from 'https://esm.sh/@vlcn.io/rx-tbl';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@vlcn.io/crsqlite-wasm/dist/crsqlite.wasm';
export default function Initialize({ Comp }) {
    const [ctxts, setCtxts] = useState(null);
    useEffect(() => {
        if (window.__bringowncrdt) {
            window.__bringowncrdt.then((newCtxts) => {
                if (ctxts != null)
                    return;
                setCtxts(newCtxts);
            });
        }
        else {
            window.__bringowncrdt = init();
            window.__bringowncrdt.then((newCtxts) => {
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
    const createDagCtx = async (db) => {
        await createSchema(db);
        const rx = tblrx(db);
        return { db, rx };
    };
    const ctxts = await Promise.all([
        await sqlite.open(':memory:'),
        await sqlite.open(':memory:'),
        await sqlite.open(':memory:'),
    ].map(createDagCtx));
    return { ctxts };
}
async function createSchema(db) {
    await db.tx(async (tx) => {
        await tx.exec(`CREATE TABLE event (
      id INTEGER PRIMARY KEY NOT NULL,
      mutation_name TEXT,
      args ANY
    ) STRICT;`);
        await tx.exec(`CREATE TABLE event_dag (
      parent_id ANY NOT NULL,
      event_id INTEGER NOT NULL,
      PRIMARY KEY (parent_id, event_id)
    ) STRICT;`);
        await tx.exec(`CREATE INDEX event_dag_event ON event_dag (event_id);`);
        await tx.exec("SELECT crsql_as_crr('event');");
        await tx.exec("SELECT crsql_as_crr('event_dag');");
        await tx.exec(`CREATE TABLE todo (id INTEGER PRIMARY KEY NOT NULL, content TEXT, completed INTEGER);`);
        await tx.exec(`CREATE TABLE counter (id INTEGER PRIMARY KEY NOT NULL CHECK (id = 0), count INTEGER DEFAULT 0)`);
    });
}
