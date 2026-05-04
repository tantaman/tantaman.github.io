// @ts-ignore
import React, { useEffect, useState } from 'https://esm.sh/react';
import { injectStyle } from '../shared/injectStyle.js';
import { nanoid } from '../shared/nanoid.js';
import randomWords from '../shared/randomWords.js';
import Tbl from './Tbl.js';
import { CSS } from './styles.js';

const wordOptions = { exactly: 2, join: ' ' };
const makeRow = (classname) => ({
  id: nanoid(10),
  content: randomWords(wordOptions),
  classname,
});

export default function GSetExample() {
  injectStyle('gentle-crdts', CSS);
  const [rowsA, setRowsA] = useState([]);
  const [rowsB, setRowsB] = useState([]);
  // populate after mount so SSR/CSR markup matches.
  useEffect(() => {
    setRowsA(Array.from({ length: 3 }).map(() => makeRow('gc-a-row')));
    setRowsB(Array.from({ length: 3 }).map(() => makeRow('gc-b-row')));
  }, []);
  const [rowsMerged, setRowsMerged] = useState([]);

  const addRow = (coll, setter, classname) =>
    setter([...coll, makeRow(classname)]);

  const merge = () => {
    const merged = [];
    for (let i = 0; i < Math.max(rowsA.length, rowsB.length); i++) {
      if (i < rowsA.length) merged.push(rowsA[i]);
      if (i < rowsB.length) merged.push(rowsB[i]);
    }
    setRowsMerged(merged);
  };

  return (
    <div>
      <div className="gc-pair-tables">
        <div className="gc-tbl-contain">
          <strong>Node A</strong>
          <div className="gc-tbl-a">
            <Tbl rows={rowsA} />
          </div>
          <button
            className="gc-btn"
            onClick={() => addRow(rowsA, setRowsA, 'gc-a-row')}
          >
            Add Row
          </button>
        </div>
        <div className="gc-tbl-contain">
          <strong>Node B</strong>
          <div className="gc-tbl-b">
            <Tbl rows={rowsB} />
          </div>
          <button
            className="gc-btn"
            onClick={() => addRow(rowsB, setRowsB, 'gc-b-row')}
          >
            Add Row
          </button>
        </div>
      </div>
      <div className="gc-merge-contain">
        <button className="gc-btn" onClick={merge}>
          ↓ Merge! ↓
        </button>
        <br />
        <strong>Merge Result</strong>
        <div className="gc-tbl-merge">
          <Tbl rows={rowsMerged} />
        </div>
      </div>
    </div>
  );
}
