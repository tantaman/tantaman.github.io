// @ts-nocheck
import React from 'https://esm.sh/react';
import { useQuery } from 'https://esm.sh/@vlcn.io/react?deps=react,react-dom';

export default function EventTable({ ctx, nodeName }) {
  const allEvents = useQuery(
    ctx,
    `SELECT id, mutation_name as mutationName, args FROM event ORDER BY id ASC`,
    [],
  );
  return (
    <>
      <h2>Mutations - {nodeName}</h2>
      <table className="byo-stateTable">
        <thead>
          <tr>
            <th>mutation id</th>
            <th>name</th>
            <th>args</th>
          </tr>
        </thead>
        <tbody>
          {allEvents.data.map((event) => (
            <tr key={event.id.toString()}>
              <td className="byo-id-readout">{event.id}</td>
              <td>{event.mutationName}</td>
              <td>{event.args}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
