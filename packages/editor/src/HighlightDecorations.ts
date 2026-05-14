import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';

export interface Highlight {
  id: number;
  quoted_text: string;
  color: string | null;
}

interface HighlightDecorationsOptions {
  onClick?: (thoughtId: number) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    highlightDecorations: {
      setHighlights: (highlights: Highlight[]) => ReturnType;
    };
  }
}

const pluginKey = new PluginKey<DecorationSet>('highlight-decorations');
const SET_HIGHLIGHTS_META = 'setHighlights';

interface TextSegment {
  start: number;
  pos: number;
  text: string;
}

function collectSegments(doc: PMNode): { flat: string; segments: TextSegment[] } {
  const segments: TextSegment[] = [];
  let flat = '';
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      segments.push({ start: flat.length, pos, text: node.text });
      flat += node.text;
    } else if (node.isBlock && flat.length > 0 && !flat.endsWith('\n')) {
      flat += '\n';
    }
  });
  return { flat, segments };
}

function flatIndexToPos(flatIdx: number, segments: TextSegment[]): number | null {
  for (const seg of segments) {
    const segEnd = seg.start + seg.text.length;
    if (flatIdx >= seg.start && flatIdx <= segEnd) {
      return seg.pos + (flatIdx - seg.start);
    }
  }
  return null;
}

function buildDecorations(doc: PMNode, highlights: Highlight[]): DecorationSet {
  if (highlights.length === 0) return DecorationSet.empty;
  const { flat, segments } = collectSegments(doc);
  const decorations: Decoration[] = [];
  for (const h of highlights) {
    const target = h.quoted_text.trim();
    if (!target) continue;
    const idx = flat.indexOf(target);
    if (idx < 0) continue;
    const from = flatIndexToPos(idx, segments);
    const to = flatIndexToPos(idx + target.length, segments);
    if (from == null || to == null || from === to) continue;
    decorations.push(
      Decoration.inline(from, to, {
        class: 'md-highlight',
        'data-thought-id': String(h.id),
        ...(h.color ? { style: `--highlight-color: ${h.color}` } : {}),
      }),
    );
  }
  return DecorationSet.create(doc, decorations);
}

export const HighlightDecorations = Extension.create<HighlightDecorationsOptions>({
  name: 'highlightDecorations',

  addStorage() {
    return {
      highlights: [] as Highlight[],
    };
  },

  addCommands() {
    return {
      setHighlights:
        (highlights: Highlight[]) =>
        ({ tr, dispatch }) => {
          this.storage.highlights = highlights;
          if (dispatch) {
            tr.setMeta(SET_HIGHLIGHTS_META, highlights);
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const onClick = this.options.onClick;
    return [
      new Plugin<DecorationSet>({
        key: pluginKey,
        state: {
          init: (_, state) => buildDecorations(state.doc, this.storage.highlights),
          apply: (tr, oldSet) => {
            const meta = tr.getMeta(SET_HIGHLIGHTS_META) as Highlight[] | undefined;
            if (meta !== undefined) {
              return buildDecorations(tr.doc, meta);
            }
            if (tr.docChanged) {
              return buildDecorations(tr.doc, this.storage.highlights);
            }
            return oldSet;
          },
        },
        props: {
          decorations(state) {
            return pluginKey.getState(state);
          },
          handleClick: (_view, _pos, event) => {
            if (!onClick) return false;
            const target = event.target as HTMLElement | null;
            const mark = target?.closest('.md-highlight') as HTMLElement | null;
            if (!mark) return false;
            const id = mark.getAttribute('data-thought-id');
            if (!id) return false;
            onClick(parseInt(id, 10));
            return true;
          },
        },
      }),
    ];
  },
});
