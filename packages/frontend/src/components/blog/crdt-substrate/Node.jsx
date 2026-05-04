// @ts-ignore
import React, { useMemo, useState } from 'https://esm.sh/react';
import Mutation from './Mutation.js';
import NodeResult from './NodeResult.js';

export function Node({ mutations, name, state }) {
  const [priorState, setPriorState] = useState(state);
  const [theState, setTheState] = useState(state);

  function applyMutation(fn) {
    setTheState(fn(theState));
  }

  // reset from outer component
  if (state != priorState) {
    setPriorState(state);
    setTheState(state);
  }

  const maxArgs = useMemo(() => {
    return Object.entries(mutations).reduce((acc, [, fn]) => {
      return Math.max(acc, fn.numArgs);
    }, 0);
  }, [mutations]);

  return (
    <div className="cs-node-root">
      <h1>
        N{name.substring(1, 4)} {name.substring(4)}
      </h1>
      <div className="cs-node">
        <div className="cs-node-table">
          <h2>Mutations</h2>
          <table>
            <thead>
              <tr>
                <th>mutation</th>
                <th colSpan={maxArgs + 1} style={{ textAlign: 'left' }}>
                  args...
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(mutations).map(([name, fn]) => (
                <Mutation
                  fn={fn}
                  onClick={applyMutation}
                  key={name}
                  name={name}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="cs-node-state">
          <h2>State</h2>
          <NodeResult state={theState} />
        </div>
      </div>
    </div>
  );
}

export default Node;
