import { Node, mergeAttributes, InputRule, nodePasteRule } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

/**
 * Wikilink atom:
 *   `[[dNN]]`        → document NN
 *   `[[tNN]]`        → thought NN
 *   `[[p-XXX]]`      → paste XXX (alphanumeric id)
 *   `[[…|label]]`    → optional alt label for any of the above
 *
 * - Renders as a styled `<a>` that navigates on click (hash for docs/thoughts,
 *   top-level `/paste/<id>` for pastes).
 * - Round-trips to markdown verbatim.
 * - Created by InputRule (typing) and PasteRule (pasting).
 * - Loaded markdown is post-processed by `applyWikiLinkTransform` since
 *   markdown-it parses the `[[…]]` syntax as plain text.
 */

export type WikiLinkKind = 'doc' | 'thought' | 'paste';

export interface WikiLinkAttrs {
  kind: WikiLinkKind;
  targetId: string;
  label: string | null;
}

// match[1] = the bare ref ("d5" / "t12" / "p-V1StGXR")
// match[2] = optional label
const PATTERN_GLOBAL = /\[\[(d\d+|t\d+|p-[A-Za-z0-9_-]+)(?:\|([^\]|]+))?\]\]/g;
const PATTERN_END = /\[\[(d\d+|t\d+|p-[A-Za-z0-9_-]+)(?:\|([^\]|]+))?\]\]$/;

function parseRef(ref: string): { kind: WikiLinkKind; targetId: string } | null {
  if (ref.startsWith('p-')) return { kind: 'paste', targetId: ref.slice(2) };
  if (ref.startsWith('d')) return { kind: 'doc', targetId: ref.slice(1) };
  if (ref.startsWith('t')) return { kind: 'thought', targetId: ref.slice(1) };
  return null;
}

function refFor(kind: WikiLinkKind, targetId: string): string {
  if (kind === 'paste') return `p-${targetId}`;
  return `${kind === 'doc' ? 'd' : 't'}${targetId}`;
}

function hrefFor(kind: WikiLinkKind, targetId: string): string {
  if (kind === 'doc') return `#document-${targetId}`;
  if (kind === 'thought') return `#thought-${targetId}`;
  return `/paste/${targetId}`;
}

function defaultLabelFor(kind: WikiLinkKind, targetId: string): string {
  if (kind === 'paste' && targetId.length > 8) return `p-${targetId.slice(0, 7)}…`;
  return refFor(kind, targetId);
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
      targetId: { default: '' },
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
          const targetId = dom.getAttribute('data-id') || '';
          if (!targetId) return false;
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
    const targetId = String(node.attrs.targetId ?? '');
    const label = node.attrs.label as string | null;
    const text = label || defaultLabelFor(kind, targetId);
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-wikilink': '',
        'data-kind': kind,
        'data-id': targetId,
        ...(label ? { 'data-label': label } : {}),
        href: hrefFor(kind, targetId),
        class: 'wiki-link',
      }),
      text,
    ];
  },

  addInputRules() {
    const nodeType = this.type;
    return [
      new InputRule({
        find: PATTERN_END,
        handler: ({ state, range, match }) => {
          const parsed = parseRef(match[1]);
          if (!parsed) return null;
          const node = nodeType.create({
            kind: parsed.kind,
            targetId: parsed.targetId,
            label: match[2]?.trim() || null,
          });
          state.tr.replaceWith(range.from, range.to, node);
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: PATTERN_GLOBAL,
        type: this.type,
        getAttributes: (match) => {
          const parsed = parseRef(match[1]);
          if (!parsed) return false as any;
          return {
            kind: parsed.kind,
            targetId: parsed.targetId,
            label: match[2]?.trim() || null,
          };
        },
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
            const targetId = String(node.attrs.targetId ?? '');
            if (!targetId) return false;
            event.preventDefault();
            if (kind === 'paste') {
              window.location.href = `/paste/${targetId}`;
            } else {
              window.location.hash = hrefFor(kind, targetId).slice(1);
            }
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
          const targetId = String(node.attrs.targetId ?? '');
          const label = node.attrs.label as string | null;
          const ref = refFor(kind, targetId);
          if (label) state.write(`[[${ref}|${label}]]`);
          else state.write(`[[${ref}]]`);
        },
      },
    };
  },
});

/**
 * Replace text matching the wikilink syntax with WikiLink atom nodes.
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
      const [whole, ref, label] = m;
      const parsed = parseRef(ref);
      if (!parsed) continue;
      const start = pos + m.index;
      const end = start + whole.length;
      const wikiNode = wikiNodeType.create({
        kind: parsed.kind,
        targetId: parsed.targetId,
        label: label?.trim() || null,
      });
      replacements.push({ from: start, to: end, node: wikiNode });
    }
  });

  if (replacements.length === 0) return;

  const tr = state.tr;
  for (const r of replacements.reverse()) {
    tr.replaceWith(r.from, r.to, r.node);
  }
  tr.setMeta('addToHistory', false);
  editor.view.dispatch(tr);
}
