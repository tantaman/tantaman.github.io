// @ts-ignore
import React from 'https://esm.sh/react';
import { injectStyle } from '../shared/injectStyle.js';
import { CSS } from './styles.js';
export default function Tbl({ rows }) {
    injectStyle('gentle-crdts', CSS);
    return (React.createElement("table", { className: "gc-table" },
        React.createElement("thead", null,
            React.createElement("tr", null,
                React.createElement("th", null, "id"),
                React.createElement("th", null, "content"))),
        React.createElement("tbody", null, rows.map((row) => (React.createElement("tr", { className: row.classname, key: row.id },
            React.createElement("td", null, row.id),
            React.createElement("td", null, row.content)))))));
}
