import { Extension } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Node as ProseMirrorNode, Slice } from "@tiptap/pm/model";
import type { Schema } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

/** A GFM table's `| --- | --- |` separator row. */
const TABLE_DELIMITER = /^ {0,3}\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)+\|?[ \t]*$/m;

/** Block-level markdown syntax: any one of these on its own line means the paste is markdown. */
const BLOCK_PATTERNS: RegExp[] = [
  /^ {0,3}#{1,6}[ \t]+\S/m, // # heading
  /^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]+\S/m, // - list item / 1. list item
  /^ {0,3}>[ \t]?\S/m, // > blockquote
  /^ {0,3}(?:```|~~~)/m, // ``` fenced code
  /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/m, // --- thematic break
  TABLE_DELIMITER,
];

/** Inline markdown syntax: weaker on its own, but still unambiguous enough to treat as markdown. */
const INLINE_PATTERNS: RegExp[] = [
  /!?\[[^\]\n]*\]\([^)\s]+(?:[ \t]+"[^"\n]*")?\)/, // [link](url) / ![image](url)
  /(?:^|[^\w\\*])\*\*[^\s*][^*\n]*\*\*/, // **bold**
  /(?:^|[^\w\\_])__[^\s_][^_\n]*__/, // __bold__
  /(?:^|[^\w\\`])`[^`\n]+`/, // `code`
  /(?:^|[^\w\\~])~~[^\s~][^~\n]*~~/, // ~~strike~~
];

/**
 * Markdown whose meaning the editor's schema cannot hold. Parsing these would silently drop
 * content — a table disappears, raw HTML and MDX components vanish, a task item loses its checkbox
 * — so the paste is declined and the source text lands verbatim instead. The published renderer
 * (`marked`, GFM) understands more than the editor's node schema does, so leaving the markdown
 * alone keeps the post correct. Each entry re-enables itself if the matching node is ever added to
 * the editor.
 */
const UNSUPPORTED: { pattern: RegExp; nodes: string[] }[] = [
  { pattern: TABLE_DELIMITER, nodes: ["table"] },
  { pattern: /^ {0,3}[-*+][ \t]+\[[ xX]\][ \t]/m, nodes: ["taskItem"] },
  // Raw HTML, HTML comments and MDX components have no node to parse into at all.
  { pattern: /<!--|<\/?[A-Za-z][A-Za-z0-9-]*(?:[\s/>]|$)/, nodes: ["html"] },
];

function wouldLoseContent(text: string, schema: Schema): boolean {
  return UNSUPPORTED.some(
    ({ pattern, nodes }) => pattern.test(text) && !nodes.some((name) => name in schema.nodes),
  );
}

/** Does this text read as markdown *source*, rather than prose, a URL, or a code snippet? */
export function looksLikeMarkdown(text: string): boolean {
  if (!text.trim()) return false;
  return BLOCK_PATTERNS.some((re) => re.test(text)) || INLINE_PATTERNS.some((re) => re.test(text));
}

/**
 * Parse markdown into a slice for the current selection. A result that is a single paragraph is
 * unwrapped to its inline content so a one-line paste merges into the paragraph the cursor is in
 * instead of splitting it; anything longer is pasted as blocks.
 */
function markdownSlice(editor: Editor, view: EditorView, text: string): Slice | null {
  const manager = editor.markdown;
  if (!manager) return null;

  let doc: ProseMirrorNode;
  try {
    const json = manager.parse(text);
    if (!json.content?.length) return null;
    doc = ProseMirrorNode.fromJSON(view.state.schema, json);
  } catch {
    return null; // Unparseable markdown falls back to ProseMirror's plain-text paste.
  }

  const single = doc.childCount === 1 ? doc.firstChild : null;
  const content = single?.type.name === "paragraph" ? single.content : doc.content;
  return content.size ? new Slice(content, 0, 0) : null;
}

/**
 * Paste markdown as formatted content.
 *
 * `@tiptap/markdown` converts markdown on the way in and out of the document (`setContent`,
 * `getMarkdown`) but leaves the clipboard alone, and ProseMirror's own paste path treats plain text
 * as literal text. Copying markdown out of another editor, a chat window, or a rendered page
 * therefore dropped the source in verbatim — `# Heading` stayed `# Heading`.
 *
 * This plugin inspects the plain-text flavour of the clipboard first: when it reads as markdown
 * source it parses that and pastes the result, tagging the transaction as a paste so paste rules
 * still run.
 *
 * Deliberately left alone:
 * - Shift-paste, the editor convention for "paste as plain text".
 * - Slices copied from another ProseMirror surface (`data-pm-slice`), which already carry exact
 *   node structure.
 * - Pastes into a code block, where the raw text is the point.
 * - Text that does not read as markdown, so rich content pasted from a web page keeps its
 *   formatting and prose stays literal.
 * - Markdown the editor's schema cannot represent (see `UNSUPPORTED`), which would lose content.
 */
export const MarkdownPaste = Extension.create({
  name: "markdownPaste",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey("markdownPaste"),
        props: {
          handlePaste: (view, event) => {
            const data = event.clipboardData;
            if (!data) return false;

            const text = data.getData("text/plain");
            if (!text) return false;
            if (data.getData("text/html").includes("data-pm-slice")) return false;

            const input = (view as unknown as { input?: { shiftKey: boolean; lastKeyCode: number } })
              .input;
            if (input?.shiftKey && input.lastKeyCode !== 45) return false;

            if (view.state.selection.$from.parent.type.spec.code) return false;
            if (!looksLikeMarkdown(text)) return false;
            if (wouldLoseContent(text, view.state.schema)) return false;

            const slice = markdownSlice(editor, view, text);
            if (!slice) return false;

            // Mirrors prosemirror-view's own paste dispatch, including the metadata paste rules
            // key off.
            const single =
              slice.openStart === 0 && slice.openEnd === 0 && slice.content.childCount === 1
                ? slice.content.firstChild
                : null;
            const tr = single
              ? view.state.tr.replaceSelectionWith(single, false)
              : view.state.tr.replaceSelection(slice);
            view.dispatch(tr.scrollIntoView().setMeta("paste", true).setMeta("uiEvent", "paste"));
            return true;
          },
        },
      }),
    ];
  },
});
