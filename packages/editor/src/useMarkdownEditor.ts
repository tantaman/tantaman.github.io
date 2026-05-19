import { useEditor } from '@tiptap/react';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Markdown } from 'tiptap-markdown';
import { common, createLowlight } from 'lowlight';
import { WikiLink, applyWikiLinkTransform } from './WikiLink';
import { HighlightDecorations } from './HighlightDecorations';
import { Collab } from './CollabExtension';

export type { Editor };

const lowlight = createLowlight(common);

export type PlaceholderResolver = (args: {
  editor: Editor;
  node: any;
  pos: number;
  hasAnchor: boolean;
}) => string;

export interface UseMarkdownEditorOptions {
  placeholder?: string | PlaceholderResolver;
  autofocus?: boolean | 'start' | 'end' | 'all' | number;
  spellcheck?: boolean;
  /** Apply per-node placeholders (placeholder shows for any empty top-level node, not just the current one). */
  placeholderShowOnAllEmpty?: boolean;
  /** Click handler for highlight decorations (set via setHighlights command). */
  onHighlightClick?: (thoughtId: number) => void;
  /**
   * Enable prosemirror-collab. Must be set at editor construction time — both
   * `version` (starting confirmed version) and `clientID` (must be unique
   * across concurrent editors of the same doc) are fixed for the editor's
   * lifetime.
   */
  collab?: { version: number; clientID: number };
  /**
   * Initial content (ProseMirror JSON). Provided at construction time so the
   * collab plugin sees it as the starting doc rather than as user edits.
   * Changing this prop re-creates the editor.
   */
  content?: unknown;
}

/**
 * Tiptap editor preconfigured with the standard set of extensions
 * (markdown, starter kit minus default code block, code block w/ syntax
 * highlighting, links, images, task lists, placeholder).
 */
export function useMarkdownEditor(opts: UseMarkdownEditorOptions = {}): Editor | null {
  const {
    placeholder = 'Start writing... (type / for commands)',
    autofocus,
    spellcheck = true,
    placeholderShowOnAllEmpty,
    onHighlightClick,
    collab,
    content,
  } = opts;
  const extensions = [
    StarterKit.configure({ codeBlock: false }),
    Placeholder.configure({
      placeholder: placeholder as any,
      showOnlyCurrent: !placeholderShowOnAllEmpty,
      includeChildren: !!placeholderShowOnAllEmpty,
    }),
    Link.configure({ openOnClick: false }),
    Image,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true, allowTableNodeSelection: true }),
    TableRow,
    TableHeader,
    TableCell,
    CodeBlockLowlight.configure({ lowlight }),
    WikiLink,
    HighlightDecorations.configure({ onClick: onHighlightClick }),
    Markdown,
  ] as any[];
  if (collab) extensions.push(Collab.configure(collab));
  return useEditor({
    autofocus: autofocus ?? false,
    extensions,
    content: content as any,
    editorProps: {
      attributes: {
        spellcheck: spellcheck ? 'true' : 'false',
      },
    },
  }, [collab?.version, collab?.clientID, content]);
}

interface MarkdownStorage {
  getMarkdown(): string;
  parser: { parse(markdown: string): unknown };
}

function markdownStorage(editor: Editor): MarkdownStorage {
  return (editor.storage as unknown as Record<string, MarkdownStorage>).markdown;
}

/** Get the current document as markdown. */
export function getMarkdown(editor: Editor): string {
  return markdownStorage(editor).getMarkdown();
}

/** Replace the document with parsed markdown. */
export function setMarkdown(editor: Editor, markdown: string): void {
  editor.commands.setContent(markdownStorage(editor).parser.parse(markdown) as never);
  applyWikiLinkTransform(editor);
}

function headlessEditor(): Editor {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Link.configure({ openOnClick: false }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({ lowlight }),
      WikiLink,
      Markdown,
    ],
  });
}

/**
 * Convert a markdown string into a ProseMirror doc JSON without an existing
 * editor. Uses a transient headless Tiptap editor configured with the same
 * extensions as the live editor (minus collab + placeholder). The result is
 * suitable for seeding a collab room.
 */
export function parseMarkdownToDoc(markdown: string): unknown {
  const editor = headlessEditor();
  setMarkdown(editor, markdown);
  const json = editor.getJSON();
  editor.destroy();
  return json;
}

/** Convert a ProseMirror doc JSON back to markdown (no live editor required). */
export function docToMarkdown(doc: unknown): string {
  const editor = headlessEditor();
  editor.commands.setContent(doc as never);
  const md = getMarkdown(editor);
  editor.destroy();
  return md;
}
