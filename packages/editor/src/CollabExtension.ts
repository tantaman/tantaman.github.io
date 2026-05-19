import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { Step } from '@tiptap/pm/transform';
import {
  collab,
  getVersion as pmGetVersion,
  sendableSteps as pmSendableSteps,
  receiveTransaction as pmReceiveTransaction,
} from 'prosemirror-collab';

export interface CollabOptions {
  version: number;
  clientID: number;
}

/**
 * Tiptap wrapper around prosemirror-collab. Tracks the editor's confirmed
 * version + unconfirmed local steps so a host component can ship them to
 * an authority and replay remote steps back into the editor.
 *
 * Configure the version + clientID at editor construction; both are static
 * for the lifetime of the editor instance (clientIDs MUST be unique across
 * concurrent editors of the same doc).
 */
export const Collab = Extension.create<CollabOptions>({
  name: 'pmCollab',

  addOptions() {
    return {
      version: 0,
      clientID: Math.floor(Math.random() * 0xffffffff),
    };
  },

  addProseMirrorPlugins() {
    return [collab({ version: this.options.version, clientID: this.options.clientID })];
  },
});

/** Current collab version (latest version confirmed by the authority). */
export function getCollabVersion(editor: Editor): number {
  return pmGetVersion(editor.state);
}

/** Returns local steps not yet sent to the authority, or null if none. */
export function getSendableSteps(editor: Editor): {
  version: number;
  steps: readonly unknown[];
  clientID: number | string;
} | null {
  const sendable = pmSendableSteps(editor.state);
  if (!sendable) return null;
  return {
    version: sendable.version,
    steps: sendable.steps.map((s) => s.toJSON()),
    clientID: sendable.clientID,
  };
}

/**
 * Apply remote steps to the editor, advancing its confirmed version and
 * rebasing any unconfirmed local steps on top.
 */
export function receiveSteps(
  editor: Editor,
  steps: unknown[],
  clientIDs: (number | string)[],
): void {
  const schema = editor.state.schema;
  const pmSteps = steps.map((raw) => Step.fromJSON(schema, raw as Record<string, unknown>));
  const tr = pmReceiveTransaction(editor.state, pmSteps, clientIDs, { mapSelectionBackward: true });
  editor.view.dispatch(tr);
}
