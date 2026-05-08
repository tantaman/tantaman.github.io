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
      Markdown,
    ],
    editorProps: {
      attributes: {
        spellcheck: spellcheck ? 'true' : 'false',
      },
    },
  });
}

/** Get the current document as markdown. */
export function getMarkdown(editor: Editor): string {
  return editor.storage.markdown.getMarkdown() as string;
}

/** Replace the document with parsed markdown. */
export function setMarkdown(editor: Editor, markdown: string): void {
  editor.commands.setContent(editor.storage.markdown.parser.parse(markdown));
  applyWikiLinkTransform(editor);
}
