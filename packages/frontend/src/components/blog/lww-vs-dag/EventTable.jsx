// @ts-nocheck
import React from 'https://esm.sh/react';
import { useQuery } from 'https://esm.sh/@vlcn.io/react?deps=react,react-dom';

export default function EventTable({ ctx, nodeName }) {
  const allEvents = useQuery(
    ctx,
    `SELECT id, item_id as itemId, type, value FROM event ORDER BY id ASC`,
    [],
  );
  return (
    <>
      <h2>Events - {nodeName}</h2>
      <table className="lwd-stateTable">
        <thead>
          <tr>
            <th>id</th>
            <th>item_id</th>
            <th>type</th>
            <th>value</th>
          </tr>
        </thead>
        <tbody>
          {allEvents.data.map((event) => (
            <tr key={event.id.toString()}>
              <td className="lwd-id-readout">
                ...{event.id.toString().slice(-4)}
              </td>
              <td>...{(event.itemId || '').toString().slice(-4)}</td>
              <td>{event.type}</td>
              <td>{event.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
