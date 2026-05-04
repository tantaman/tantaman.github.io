// @ts-ignore
import React, { useCallback, useEffect, useMemo, useState } from 'https://esm.sh/react';
import { getResource } from '../runnable-code/CodeNode.js';
import DAG from './DAG.js';
import { Node } from './Node.js';
import asTrackedMutations from './trackMutations.js';
import { injectStyle } from '../shared/injectStyle.js';
import { CSS } from './styles.js';

export default function Nodes() {
  injectStyle('crdt-substrate', CSS);
  const [mutations, setMutations] = useState({});
  const [initialState, setInitialState] = useState({});

  const trackedMutations = useMemo(() => {
    if (mutations.resolution) {
      return asTrackedMutations(mutations.resolution);
    }
    return {};
  }, [mutations]);

  const [nodeStates, setNodeStates] = useState({
    nodeA: { dag: new DAG('nodeA'), state: null },
    nodeB: { dag: new DAG('nodeB'), state: null },
    nodeC: { dag: new DAG('nodeC'), state: null },
  });

  const resetNodeStates = useCallback(
    (maybeInitialState) => {
      const state = maybeInitialState || initialState.resolution;
      if (state == null) return;
      setNodeStates({
        nodeA: { dag: new DAG('nodeA'), state: structuredClone(state) },
        nodeB: { dag: new DAG('nodeB'), state: structuredClone(state) },
        nodeC: { dag: new DAG('nodeC'), state: structuredClone(state) },
      });
    },
    [initialState.resolution],
  );

  useEffect(() => {
    const mutationsResource = getResource('mutations');
    const stateResource = getResource('state');
    const offMutationsResource = mutationsResource.on(
      (_id, resolution, rejection, version) => {
        if (mutations.version == null || mutations.version < version) {
          setMutations({ resolution, rejection, version });
          resetNodeStates();
        }
      },
    );
    const offStateResource = stateResource.on(
      (_id, resolution, rejection, version) => {
        if (initialState.version == null || initialState.version < version) {
          setInitialState({ resolution, rejection, version });
          resetNodeStates(resolution);
        }
      },
    );
    return () => {
      offMutationsResource();
      offStateResource();
    };
  }, [resetNodeStates, initialState.version, mutations.version]);

  if (mutations.rejection || initialState.rejection) {
    return (
      <div>
        Error: {String(mutations.rejection ?? '')} {String(initialState.rejection ?? '')}
      </div>
    );
  }

  if (mutations.resolution == null || initialState.resolution == null) {
    return <div>Loading...</div>;
  }

  function syncNodes() {
    let dagA = nodeStates.nodeA.dag;
    let dagB = nodeStates.nodeB.dag;
    let dagC = nodeStates.nodeC.dag;

    dagA = dagA.merge(dagC);
    dagA = dagA.merge(dagB);
    dagB = dagB.merge(dagA);
    dagC = dagC.merge(dagA);

    const initialStateA = structuredClone(initialState.resolution);
    const initialStateB = structuredClone(initialState.resolution);
    const initialStateC = structuredClone(initialState.resolution);

    setNodeStates({
      nodeA: { dag: dagA, state: dagA.applyTo(initialStateA, mutations.resolution) },
      nodeB: { dag: dagB, state: dagB.applyTo(initialStateB, mutations.resolution) },
      nodeC: { dag: dagC, state: dagC.applyTo(initialStateC, mutations.resolution) },
    });
  }

  return (
    <div className="cs-group">
      <div className="cs-controls">
        <button className="cs-sync-state" onClick={syncNodes}>
          Sync nodes!
        </button>
        <button className="cs-sync-state" onClick={() => resetNodeStates()}>
          Reset!
        </button>
      </div>
      {Object.entries(nodeStates).map(([nodeName, nodeState]) => (
        <Node
          key={nodeName}
          mutations={trackedMutations}
          name={nodeName}
          state={nodeState}
        />
      ))}
      <div className="cs-controls">
        <button className="cs-sync-state" onClick={syncNodes}>
          Sync nodes!
        </button>
        <button className="cs-sync-state" onClick={() => resetNodeStates()}>
          Reset!
        </button>
      </div>
    </div>
  );
}
