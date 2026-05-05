// @ts-nocheck
import React from 'https://esm.sh/react';
import { useQuery } from 'https://esm.sh/@vlcn.io/react?deps=react,react-dom';

export default function LwwStateTable({ ctx }) {
  const allTodos = useQuery(
    ctx,
    `SELECT todo.id, todo."text", todo.completed,
      json_group_object(__crsql_col_name, json_array(__crsql_col_version, __crsql_db_version)) as clocks FROM todo
      JOIN todo__crsql_clock as v ON v.id = todo.id
      GROUP BY todo.id ORDER BY todo.id DESC`,
    [],
    (allRows) => allRows.map((r) => ({ ...r, clocks: JSON.parse(r.clocks) })),
  ).data;

  return (
    <table className="lwd-stateTable">
      <thead>
        <tr>
          <th>id</th>
          <th>content</th>
          <th>content_clock</th>
          <th>done</th>
          <th>done_clock</th>
        </tr>
      </thead>
      <tbody>
        {allTodos.map((todo) => (
          <tr key={todo.id}>
            <td className="lwd-id-readout">
              ...{todo.id.toString().slice(-4)}
            </td>
            <td>{todo.text}</td>
            <td>{(todo.clocks.text || [])[0]}</td>
            <td>{todo.completed ? 'true' : 'false'}</td>
            <td>{(todo.clocks.completed || [])[0]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
