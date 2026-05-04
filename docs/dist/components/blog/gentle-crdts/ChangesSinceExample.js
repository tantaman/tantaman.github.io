// @ts-ignore
import React, { useState } from 'https://esm.sh/react';
import { injectStyle } from '../shared/injectStyle.js';
import { nanoid } from '../shared/nanoid.js';
import randomWords from '../shared/randomWords.js';
import PushTbl from './PushTbl.js';
import { CSS } from './styles.js';
const wordOptions = { exactly: 2, join: ' ' };
const initialState = [
    { maxSeen: 0, rows: [], localTime: 0 },
    { maxSeen: 0, rows: [], localTime: 0 },
    { maxSeen: 0, rows: [], localTime: 0 },
];
function merge(to, from, since) {
    const fromRows = from.rows.filter((row) => row.local_row_time > since);
    const toRowMap = new Map();
    to.rows.forEach((row) => toRowMap.set(row.id, row));
    let max = -1;
    fromRows.forEach((row) => {
        if (row.local_row_time > max)
            max = row.local_row_time;
        if (toRowMap.has(row.id)) {
            const toRow = toRowMap.get(row.id);
            if (toRow.row_time < row.row_time) {
                toRow.content = row.content;
                toRow.row_time = row.row_time;
                toRow.local_row_time = ++to.localTime;
            }
            else if (toRow.row_time == row.row_time) {
                if (toRow.content < row.content) {
                    toRow.content = row.content;
                    ++to.localTime;
                }
            }
        }
        else {
            to.rows.push(Object.assign(Object.assign({}, row), { local_row_time: ++to.localTime }));
        }
    });
    if (max != -1)
        to.maxSeen = max;
}
export default function ChangesSinceExample() {
    injectStyle('gentle-crdts', CSS);
    const [state, setState] = useState(initialState);
    function mbSince() {
        setState((state) => {
            const newState = structuredClone(state);
            merge(newState[0], newState[1], newState[0].maxSeen);
            return newState;
        });
    }
    function mcSince() {
        setState((state) => {
            const newState = structuredClone(state);
            merge(newState[1], newState[2], newState[1].maxSeen);
            return newState;
        });
    }
    function addRow() {
        setState((state) => {
            const next = structuredClone(state);
            const time = ++next[2].localTime;
            next[2].rows.push({
                id: nanoid(10),
                content: randomWords(wordOptions),
                row_time: time,
                local_row_time: time,
            });
            return next;
        });
    }
    function modifyRow() {
        setState((state) => {
            const next = structuredClone(state);
            if (next[2].rows.length === 0)
                return next;
            const time = ++next[2].localTime;
            const idx = (Math.random() * next[2].rows.length) | 0;
            const row = next[2].rows[idx];
            row.content = randomWords(wordOptions);
            row.row_time = time;
            row.local_row_time = time;
            return next;
        });
    }
    return (React.createElement("div", null,
        React.createElement("strong", null, "Node A"),
        React.createElement("div", { className: "gc-tbl-contain" },
            React.createElement(PushTbl, { rows: state[0].rows }),
            React.createElement("button", { className: "gc-btn", onClick: mbSince },
                "Merge changes from B since: ",
                state[0].maxSeen)),
        React.createElement("strong", null, "Node B"),
        React.createElement("div", { className: "gc-tbl-contain" },
            React.createElement(PushTbl, { rows: state[1].rows }),
            React.createElement("button", { className: "gc-btn", onClick: mcSince },
                "Merge changes from C since: ",
                state[1].maxSeen)),
        React.createElement("strong", null, "Node C"),
        React.createElement("div", { className: "gc-tbl-contain" },
            React.createElement(PushTbl, { rows: state[2].rows }),
            React.createElement("button", { className: "gc-btn", style: { marginRight: 4 }, onClick: addRow }, "Add Row"),
            React.createElement("button", { className: "gc-btn", onClick: modifyRow }, "Modify Row"))));
}
