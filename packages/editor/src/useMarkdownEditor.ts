import { useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Markdown } from 'tiptap-markdown';
import { common, createLowlight } from 'lowlight';
import { WikiLink, applyWikiLinkTransform } from './WikiLink';
import { HighlightDecorations } from './HighlightDecorations';

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
  } = opts;
  return useEditor({
    autofocus: autofocus ?? false,
    extensions: [
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
      CodeBlockLowlight.configure({ lowlight }),
      WikiLink,
      HighlightDecorations.configure({ onClick: onHighlightClick }),
      Markdown,
    ],
    editorProps: {
      attributes: {
        spellcheck: spellcheck ? 'true' : 'false',
      },
    },
  });
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
