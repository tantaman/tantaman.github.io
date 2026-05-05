// @ts-nocheck
import React from 'https://esm.sh/react';
import { useQuery } from 'https://esm.sh/@vlcn.io/react?deps=react,react-dom';
export default function EventTable({ ctx, nodeName }) {
    const allEvents = useQuery(ctx, `SELECT id, mutation_name as mutationName, args FROM event ORDER BY id ASC`, []);
    return (React.createElement(React.Fragment, null,
        React.createElement("h2", null,
            "Mutations - ",
            nodeName),
        React.createElement("table", { className: "byo-stateTable" },
            React.createElement("thead", null,
                React.createElement("tr", null,
                    React.createElement("th", null, "mutation id"),
                    React.createElement("th", null, "name"),
                    React.createElement("th", null, "args"))),
            React.createElement("tbody", null, allEvents.data.map((event) => (React.createElement("tr", { key: event.id.toString() },
                React.createElement("td", { className: "byo-id-readout" }, event.id),
                React.createElement("td", null, event.mutationName),
                React.createElement("td", null, event.args))))))));
}
