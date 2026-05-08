import { Node, mergeAttributes, InputRule, nodePasteRule } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

/**
 * Wikilink atom — `[[<kind> <id>]]` with optional `|label`.
 *
 * Kinds:
 *   d → document    (numeric id)        →  #document-<id>
 *   t → thought     (numeric id)        →  #thought-<id>
 *   p → paste       (alphanumeric id)   →  /paste/<id>
 *   f → frame       (numeric id)        →  #framing-<id>
 *   b → blog post   (slug)              →  /<slug>.html
 *
 * - Created by InputRule (typing) and PasteRule (pasting).
 * - Round-trips to markdown verbatim.
 * - Loaded markdown is post-processed by `applyWikiLinkTransform` since
 *   markdown-it parses the `[[…]]` syntax as plain text.
 */

export type WikiLinkKind = 'doc' | 'thought' | 'paste' | 'frame' | 'post';

export interface WikiLinkAttrs {
  kind: WikiLinkKind;
  targetId: string;
  label: string | null;
}

const KIND_FROM_LETTER: Record<string, WikiLinkKind> = {
  d: 'doc',
  t: 'thought',
  p: 'paste',
  f: 'frame',
  b: 'post',
};

const LETTER_FROM_KIND: Record<WikiLinkKind, string> = {
  doc: 'd',
  thought: 't',
  paste: 'p',
  frame: 'f',
  post: 'b',
};

// match[1] = kind letter, match[2] = id, match[3] = optional label
const PATTERN_GLOBAL = /\[\[([dtpfb]) ([A-Za-z0-9_\-.]+)(?:\|([^\]|]+))?\]\]/g;
const PATTERN_END = /\[\[([dtpfb]) ([A-Za-z0-9_\-.]+)(?:\|([^\]|]+))?\]\]$/;

function parseLetter(letter: string): WikiLinkKind | null {
  return KIND_FROM_LETTER[letter] ?? null;
}

function refFor(kind: WikiLinkKind, targetId: string): string {
  return `${LETTER_FROM_KIND[kind]} ${targetId}`;
}

export function hrefFor(kind: WikiLinkKind, targetId: string): string {
  switch (kind) {
    case 'doc': return `#document-${targetId}`;
    case 'thought': return `#thought-${targetId}`;
    case 'paste': return `/paste/${targetId}`;
    case 'frame': return `#framing-${targetId}`;
    case 'post': return `/${targetId}.html`;
  }
}

function defaultLabelFor(kind: WikiLinkKind, targetId: string): string {
  if (kind === 'paste' && targetId.length > 8) return `p ${targetId.slice(0, 7)}…`;
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
          const kind = parseLetter(match[1]);
          if (!kind) return null;
          const node = nodeType.create({
            kind,
            targetId: match[2],
            label: match[3]?.trim() || null,
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
          const kind = parseLetter(match[1]);
          if (!kind) return false as any;
          return {
            kind,
            targetId: match[2],
            label: match[3]?.trim() || null,
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
            const href = hrefFor(kind, targetId);
            if (kind === 'paste' || kind === 'post') {
              window.location.href = href;
            } else {
              window.location.hash = href.slice(1);
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
      const [whole, letter, id, label] = m;
      const kind = parseLetter(letter);
      if (!kind) continue;
      const start = pos + m.index;
      const end = start + whole.length;
      const wikiNode = wikiNodeType.create({
        kind,
        targetId: id,
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
