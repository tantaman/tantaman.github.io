// @ts-ignore
import React from 'https://esm.sh/react';
import { injectStyle } from '../shared/injectStyle.js';
import { CSS } from './styles.js';

export default function PushTbl({ rows }) {
  injectStyle('gentle-crdts', CSS);
  return (
    <table className="gc-table">
      <thead>
        <tr>
          <th>id</th>
          <th>content</th>
          <th>row_time</th>
          <th>local_row_time</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.id}</td>
            <td>{row.content}</td>
            <td>{row.row_time}</td>
            <td>{row.local_row_time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
