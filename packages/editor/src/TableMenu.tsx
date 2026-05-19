import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/core';

export interface TableMenuProps {
  editor: Editor;
}

export function TableMenu({ editor }: TableMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableMenu"
      shouldShow={({ editor }) => editor.isEditable && editor.isActive('table')}
      options={{ placement: 'top', offset: 8 }}
    >
      <div className="md-table-menu">
        <button
          onClick={() => editor.chain().focus().addRowBefore().run()}
          title="Add row above"
        >
          ↑+
        </button>
        <button
          onClick={() => editor.chain().focus().addRowAfter().run()}
          title="Add row below"
        >
          ↓+
        </button>
        <button
          onClick={() => editor.chain().focus().deleteRow().run()}
          title="Delete row"
        >
          ↕−
        </button>
        <span className="md-table-menu-sep" />
        <button
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          title="Add column before"
        >
          ←+
        </button>
        <button
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          title="Add column after"
        >
          →+
        </button>
        <button
          onClick={() => editor.chain().focus().deleteColumn().run()}
          title="Delete column"
        >
          ↔−
        </button>
        <span className="md-table-menu-sep" />
        <button
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          title="Toggle header row"
        >
          H
        </button>
        <button
          onClick={() => editor.chain().focus().deleteTable().run()}
          title="Delete table"
        >
          ✕
        </button>
      </div>
    </BubbleMenu>
  );
}
