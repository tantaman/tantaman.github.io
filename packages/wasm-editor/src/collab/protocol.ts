// Messages between a collab client and a document's sequencer, JSON over one
// WebSocket (docs/COLLAB.md, "Protocol").

import type { WireCells, WireOp } from './ot.ts';

/** Someone else in the document, as the sequencer relays them. */
export interface PeerInfo {
  /** Their client id (one per tab). */
  id: string;
  name: string;
  /** #rrggbb */
  color: string;
  /** Their selection, in the coordinates of version v. */
  v: number;
  a: number;
  f: number;
}

export type ClientMsg =
  /** Join, or rejoin knowing everything up to `version` (-1: nothing). */
  | { t: 'hello'; client: string; version: number }
  /** One operation made against version `base`. */
  | { t: 'op'; seq: number; base: number; op: WireOp }
  /** My selection, at version `v`. */
  | { t: 'presence'; v: number; a: number; f: number };

/** A committed operation: version, client, that client's sequence number. */
export interface WireCommitted {
  v: number;
  c: string;
  s: number;
  op: WireOp;
}

export type ServerMsg =
  /** One part of a snapshot, sent before `init` when the client needs one. */
  | { t: 'snap'; part: number; parts: number; version: number; cells: WireCells; links?: string[] }
  /** Caught up: the operations after the snapshot or the client's version. */
  | {
      t: 'init';
      version: number;
      snapshot: boolean;
      ops: WireCommitted[];
      you: { id: string; name: string; color: string };
      peers: PeerInfo[];
    }
  | { t: 'ops'; ops: WireCommitted[] }
  | { t: 'presence'; peers: (PeerInfo | { id: string; gone: true })[] }
  /** Start again from `hello` with version -1. */
  | { t: 'reset'; reason: string };
