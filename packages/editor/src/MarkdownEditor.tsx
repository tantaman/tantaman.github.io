import { useEffect, useRef } from 'react';
import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import { useMarkdownEditor, getMarkdown, setMarkdown } from './useMarkdownEditor';
import { BubbleToolbar } from './BubbleToolbar';
import { SlashMenu, useSlashMenu } from './SlashMenu';

export interface MarkdownEditorProps {
  /** Initial markdown content. Set once on mount; subsequent changes ignored. */
  initialMarkdown?: string;
  /** Called whenever the document changes; receives current markdown. */
  onChange?: (markdown: string) => void;
  placeholder?: string;
  autofocus?: boolean | 'start' | 'end' | 'all' | number;
  /** Imperative editor ref. Use for setMarkdown after async load. */
  editorRef?: (editor: Editor | null) => void;
  className?: string;
}

/**
 * All-in-one markdown editor: tiptap surface + bubble toolbar + slash menu.
 *
 * For tighter control over layout/extensions, use `useMarkdownEditor` directly.
 */
export function MarkdownEditor({
  initialMarkdown,
  onChange,
  placeholder,
  autofocus,
  editorRef,
  className,
}: MarkdownEditorProps) {
  const editor = useMarkdownEditor({ placeholder, autofocus });
  const slashMenu = useSlashMenu(editor);
  const initializedRef = useRef(false);

  // Apply initial content once.
  useEffect(() => {
    if (!editor || initializedRef.current) return;
    if (initialMarkdown) setMarkdown(editor, initialMarkdown);
    initializedRef.current = true;
  }, [editor, initialMarkdown]);

  // Expose editor instance.
  useEffect(() => {
    editorRef?.(editor);
    return () => editorRef?.(null);
  }, [editor, editorRef]);

  // Forward updates as markdown.
  useEffect(() => {
    if (!editor || !onChange) return;
    const handle = () => onChange(getMarkdown(editor));
    editor.on('update', handle);
    return () => {
      editor.off('update', handle);
    };
  }, [editor, onChange]);

  return (
    <div className={className ?? 'md-editor-area'}>
      {editor && <BubbleToolbar editor={editor} />}
      <EditorContent editor={editor} />
      <SlashMenu {...slashMenu} />
    </div>
  );
}
