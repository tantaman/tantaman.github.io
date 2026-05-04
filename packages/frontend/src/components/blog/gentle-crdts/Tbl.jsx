// @ts-ignore
import React from 'https://esm.sh/react';
import { injectStyle } from '../shared/injectStyle.js';
import { CSS } from './styles.js';

export default function Tbl({ rows }) {
  injectStyle('gentle-crdts', CSS);
  return (
    <table className="gc-table">
      <thead>
        <tr>
          <th>id</th>
          <th>content</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr className={row.classname} key={row.id}>
            <td>{row.id}</td>
            <td>{row.content}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
