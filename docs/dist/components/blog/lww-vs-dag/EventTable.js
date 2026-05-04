// @ts-nocheck
import React from 'https://esm.sh/react';
import { useQuery } from 'https://esm.sh/@vlcn.io/react';
export default function EventTable({ ctx, nodeName }) {
    const allEvents = useQuery(ctx, `SELECT id, item_id as itemId, type, value FROM event ORDER BY id ASC`, []);
    return (React.createElement(React.Fragment, null,
        React.createElement("h2", null,
            "Events - ",
            nodeName),
        React.createElement("table", { className: "lwd-stateTable" },
            React.createElement("thead", null,
                React.createElement("tr", null,
                    React.createElement("th", null, "id"),
                    React.createElement("th", null, "item_id"),
                    React.createElement("th", null, "type"),
                    React.createElement("th", null, "value"))),
            React.createElement("tbody", null, allEvents.data.map((event) => (React.createElement("tr", { key: event.id.toString() },
                React.createElement("td", { className: "lwd-id-readout" },
                    "...",
                    event.id.toString().slice(-4)),
                React.createElement("td", null,
                    "...",
                    (event.itemId || '').toString().slice(-4)),
                React.createElement("td", null, event.type),
                React.createElement("td", null, event.value))))))));
}
