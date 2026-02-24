import { BubbleMenu } from '@tiptap/react';
import type { Editor } from '@tiptap/core';

export function BubbleToolbar({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
      <div className="pe-bubble-toolbar">
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
      </div>
    </BubbleMenu>
  );
}
