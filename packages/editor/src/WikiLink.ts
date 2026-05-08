import { Node, mergeAttributes, nodeInputRule, nodePasteRule } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

/**
 * Wikilink atom: `[[dNN]]` → document NN, `[[tNN]]` → thought NN.
 * Optional alt label: `[[dNN|some label]]`.
 *
 * - Renders as a styled `<a>` that navigates via location.hash.
 * - Round-trips to markdown as `[[dNN]]` (or `[[dNN|label]]`).
 * - Created by InputRule (typing) and PasteRule (pasting).
 * - Loaded markdown is post-processed by `applyWikiLinkTransform` since
 *   markdown-it parses `[[…]]` as plain text.
 */

export type WikiLinkKind = 'doc' | 'thought';

export interface WikiLinkAttrs {
  kind: WikiLinkKind;
  targetId: number;
  label: string | null;
}

const PATTERN_GLOBAL = /\[\[(d|t)(\d+)(?:\|([^\]|]+))?\]\]/g;
const PATTERN_END = /\[\[(d|t)(\d+)(?:\|([^\]|]+))?\]\]$/;

function hrefFor(kind: WikiLinkKind, targetId: number): string {
  return kind === 'doc' ? `#document-${targetId}` : `#thought-${targetId}`;
}

function defaultLabelFor(kind: WikiLinkKind, targetId: number): string {
  return `${kind === 'doc' ? 'd' : 't'}${targetId}`;
}

export const WikiLink = Node.create({
  name: 'wikiLink',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      kind: { default: 'doc' as WikiLinkKind },
      targetId: { default: null },
      label: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-wikilink]',
        getAttrs: (el: any) => {
          const dom = el as HTMLElement;
          const kind = (dom.getAttribute('data-kind') as WikiLinkKind) || 'doc';
          const targetId = Number(dom.getAttribute('data-id'));
          if (!Number.isFinite(targetId)) return false;
          return {
            kind,
            targetId,
            label: dom.getAttribute('data-label') || null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const kind = node.attrs.kind as WikiLinkKind;
    const targetId = node.attrs.targetId as number;
    const label = node.attrs.label as string | null;
    const text = label || defaultLabelFor(kind, targetId);
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-wikilink': '',
        'data-kind': kind,
        'data-id': String(targetId),
        ...(label ? { 'data-label': label } : {}),
        href: hrefFor(kind, targetId),
        class: 'wiki-link',
      }),
      text,
    ];
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: PATTERN_END,
        type: this.type,
        getAttributes: (match) => ({
          kind: match[1] === 'd' ? 'doc' : 'thought',
          targetId: parseInt(match[2], 10),
          label: match[3]?.trim() || null,
        }),
      }),
    ];
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: PATTERN_GLOBAL,
        type: this.type,
        getAttributes: (match) => ({
          kind: match[1] === 'd' ? 'doc' : 'thought',
          targetId: parseInt(match[2], 10),
          label: match[3]?.trim() || null,
        }),
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClickOn(_view, _pos, node, _nodePos, event) {
            if (node.type.name !== 'wikiLink') return false;
            const kind = node.attrs.kind as WikiLinkKind;
            const targetId = node.attrs.targetId as number;
            if (!targetId) return false;
            event.preventDefault();
            window.location.hash = hrefFor(kind, targetId).slice(1);
            return true;
          },
        },
      }),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: ProseMirrorNode) {
          const kind = node.attrs.kind as WikiLinkKind;
          const targetId = node.attrs.targetId as number;
          const label = node.attrs.label as string | null;
          const prefix = kind === 'doc' ? 'd' : 't';
          if (label) state.write(`[[${prefix}${targetId}|${label}]]`);
          else state.write(`[[${prefix}${targetId}]]`);
        },
      },
    };
  },
});

/**
 * Replace text matching `[[(d|t)NN(|label)?]]` with WikiLink atom nodes.
 * Call after parsing markdown into the editor (markdown-it sees the syntax
 * as plain text, so we lift it to atoms once the doc is in place).
 */
export function applyWikiLinkTransform(editor: Editor): void {
  const schema = editor.schema;
  const wikiNodeType = schema.nodes.wikiLink;
  if (!wikiNodeType) return;

  const { state } = editor;
  const replacements: Array<{ from: number; to: number; node: ProseMirrorNode }> = [];
  state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const text = node.text || '';
    let m: RegExpExecArray | null;
    const re = new RegExp(PATTERN_GLOBAL.source, 'g');
    while ((m = re.exec(text)) !== null) {
      const [whole, prefix, idStr, label] = m;
      const start = pos + m.index;
      const end = start + whole.length;
      const kind: WikiLinkKind = prefix === 'd' ? 'doc' : 'thought';
      const targetId = parseInt(idStr, 10);
      if (!Number.isFinite(targetId)) continue;
      const wikiNode = wikiNodeType.create({
        kind,
        targetId,
        label: label?.trim() || null,
      });
      replacements.push({ from: start, to: end, node: wikiNode });
    }
  });

  if (replacements.length === 0) return;

  const tr = state.tr;
  // Apply in reverse so earlier offsets remain valid.
  for (const r of replacements.reverse()) {
    tr.replaceWith(r.from, r.to, r.node);
  }
  // Avoid clobbering the user's selection.
  tr.setMeta('addToHistory', false);
  editor.view.dispatch(tr);
}
