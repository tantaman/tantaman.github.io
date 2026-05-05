// @ts-nocheck
import React from 'https://esm.sh/react';
import { useQuery } from 'https://esm.sh/@vlcn.io/react?deps=react,react-dom';
export default function LwwStateTable({ ctx }) {
    const allTodos = useQuery(ctx, `SELECT todo.id, todo."text", todo.completed,
      json_group_object(__crsql_col_name, json_array(__crsql_col_version, __crsql_db_version)) as clocks FROM todo
      JOIN todo__crsql_clock as v ON v.id = todo.id
      GROUP BY todo.id ORDER BY todo.id DESC`, [], (allRows) => allRows.map((r) => (Object.assign(Object.assign({}, r), { clocks: JSON.parse(r.clocks) })))).data;
    return (React.createElement("table", { className: "lwd-stateTable" },
        React.createElement("thead", null,
            React.createElement("tr", null,
                React.createElement("th", null, "id"),
                React.createElement("th", null, "content"),
                React.createElement("th", null, "content_clock"),
                React.createElement("th", null, "done"),
                React.createElement("th", null, "done_clock"))),
        React.createElement("tbody", null, allTodos.map((todo) => (React.createElement("tr", { key: todo.id },
            React.createElement("td", { className: "lwd-id-readout" },
                "...",
                todo.id.toString().slice(-4)),
            React.createElement("td", null, todo.text),
            React.createElement("td", null, (todo.clocks.text || [])[0]),
            React.createElement("td", null, todo.completed ? 'true' : 'false'),
            React.createElement("td", null, (todo.clocks.completed || [])[0])))))));
}
