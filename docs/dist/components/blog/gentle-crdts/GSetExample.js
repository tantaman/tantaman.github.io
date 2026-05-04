// @ts-ignore
import React, { useEffect, useState } from 'https://esm.sh/react';
import { injectStyle } from '../shared/injectStyle.js';
import { nanoid } from '../shared/nanoid.js';
import randomWords from '../shared/randomWords.js';
import Tbl from './Tbl.js';
import { CSS } from './styles.js';
const wordOptions = { exactly: 2, join: ' ' };
const makeRow = (classname) => ({
    id: nanoid(10),
    content: randomWords(wordOptions),
    classname,
});
export default function GSetExample() {
    injectStyle('gentle-crdts', CSS);
    const [rowsA, setRowsA] = useState([]);
    const [rowsB, setRowsB] = useState([]);
    // populate after mount so SSR/CSR markup matches.
    useEffect(() => {
        setRowsA(Array.from({ length: 3 }).map(() => makeRow('gc-a-row')));
        setRowsB(Array.from({ length: 3 }).map(() => makeRow('gc-b-row')));
    }, []);
    const [rowsMerged, setRowsMerged] = useState([]);
    const addRow = (coll, setter, classname) => setter([...coll, makeRow(classname)]);
    const merge = () => {
        const merged = [];
        for (let i = 0; i < Math.max(rowsA.length, rowsB.length); i++) {
            if (i < rowsA.length)
                merged.push(rowsA[i]);
            if (i < rowsB.length)
                merged.push(rowsB[i]);
        }
        setRowsMerged(merged);
    };
    return (React.createElement("div", null,
        React.createElement("div", { className: "gc-pair-tables" },
            React.createElement("div", { className: "gc-tbl-contain" },
                React.createElement("strong", null, "Node A"),
                React.createElement("div", { className: "gc-tbl-a" },
                    React.createElement(Tbl, { rows: rowsA })),
                React.createElement("button", { className: "gc-btn", onClick: () => addRow(rowsA, setRowsA, 'gc-a-row') }, "Add Row")),
            React.createElement("div", { className: "gc-tbl-contain" },
                React.createElement("strong", null, "Node B"),
                React.createElement("div", { className: "gc-tbl-b" },
                    React.createElement(Tbl, { rows: rowsB })),
                React.createElement("button", { className: "gc-btn", onClick: () => addRow(rowsB, setRowsB, 'gc-b-row') }, "Add Row"))),
        React.createElement("div", { className: "gc-merge-contain" },
            React.createElement("button", { className: "gc-btn", onClick: merge }, "\u2193 Merge! \u2193"),
            React.createElement("br", null),
            React.createElement("strong", null, "Merge Result"),
            React.createElement("div", { className: "gc-tbl-merge" },
                React.createElement(Tbl, { rows: rowsMerged })))));
}
