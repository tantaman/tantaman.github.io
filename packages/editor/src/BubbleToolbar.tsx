import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/core';

export interface BubbleToolbarProps {
  editor: Editor;
  /** Optional handler invoked with the currently selected text. When provided,
   * the toolbar shows a highlight button that calls this with the selection. */
  onHighlight?: (text: string) => void | Promise<void>;
}

export function BubbleToolbar({ editor, onHighlight }: BubbleToolbarProps) {
  return (
    <BubbleMenu editor={editor}>
      <div className="md-bubble-toolbar">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="Bold"
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive('code') ? 'is-active' : ''}
          title="Inline code"
        >
          {'<>'}
        </button>
        <button
          onClick={() => {
            const url = prompt('URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            } else {
              editor.chain().focus().unsetLink().run();
            }
          }}
          className={editor.isActive('link') ? 'is-active' : ''}
          title="Link"
        >
          &#128279;
        </button>
        {onHighlight && (
          <button
            onClick={() => {
              const { from, to } = editor.state.selection;
              const text = editor.state.doc.textBetween(from, to, '\n\n', ' ').trim();
              if (text) onHighlight(text);
            }}
            title="Capture as thought"
          >
            &#128396;
          </button>
        )}
      </div>
    </BubbleMenu>
  );
}
