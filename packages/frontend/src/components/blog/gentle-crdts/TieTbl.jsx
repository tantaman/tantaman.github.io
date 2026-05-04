// @ts-ignore
import React from 'https://esm.sh/react';
import { injectStyle } from '../shared/injectStyle.js';
import { CSS } from './styles.js';

export default function TieTbl({ row }) {
  injectStyle('gentle-crdts', CSS);
  return (
    <table className="gc-table">
      <thead>
        <tr>
          <th>id</th>
          <th>content</th>
          <th>time</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{row.id}</td>
          <td>{row.content}</td>
          <td>{row.time}</td>
        </tr>
      </tbody>
    </table>
  );
}
