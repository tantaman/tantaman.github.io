// @ts-ignore
import React from 'https://esm.sh/react';
// @ts-ignore
import { ObjectView } from 'https://esm.sh/react-object-view';

const palette = { base00: '#192830' };

export default function NodeResult({ state }) {
  return (
    <ObjectView
      data={{ '': state.state }}
      palette={palette}
      options={{ expandLevel: 2 }}
    />
  );
}
