import {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react';
import type { Editor } from '@tiptap/core';

interface SlashItem {
  label: string;
  icon: string;
  action: (editor: Editor) => void;
}

const ITEMS: SlashItem[] = [
  {
    label: 'Heading 1',
    icon: 'H1',
    action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: 'Heading 2',
    icon: 'H2',
    action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: 'Heading 3',
    icon: 'H3',
    action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: 'Bullet List',
    icon: '•',
    action: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    label: 'Numbered List',
    icon: '1.',
    action: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    label: 'Task List',
    icon: '☐',
    action: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    label: 'Code Block',
    icon: '{}',
    action: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: 'Blockquote',
    icon: '❝',
    action: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    label: 'Table',
    icon: '⊞',
    action: (e) =>
      e
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    label: 'Image',
    icon: '🖼',
    action: (e) => {
      const url = prompt('Image URL:');
      if (url) e.chain().focus().setImage({ src: url }).run();
    },
  },
  {
    label: 'Horizontal Rule',
    icon: '—',
    action: (e) => e.chain().focus().setHorizontalRule().run(),
  },
];

export function useSlashMenu(editor: Editor | null) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      if (event.key === 'Escape') {
        close();
        event.preventDefault();
        return;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % filtered.length);
        event.preventDefault();
        return;
      }

      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
        event.preventDefault();
        return;
      }

      if (event.key === 'Enter') {
        if (filtered[selectedIndex]) {
          const { from } = editor.state.selection;
          const slashPos = from - query.length - 1;
          editor.chain().deleteRange({ from: slashPos, to: from }).run();
          filtered[selectedIndex].action(editor);
          close();
        }
        event.preventDefault();
        return;
      }

      if (event.key === 'Backspace') {
        if (query.length === 0) {
          close();
        } else {
          setQuery((q) => q.slice(0, -1));
          setSelectedIndex(0);
        }
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        setQuery((q) => q + event.key);
        setSelectedIndex(0);
      }
    };

    const handleSlash = ({ editor: ed }: { editor: Editor }) => {
      const { $from } = ed.state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      if (textBefore.endsWith('/') && (textBefore.length === 1 || textBefore.at(-2) === ' ')) {
        const coords = ed.view.coordsAtPos(ed.state.selection.from);
        setPosition({ top: coords.bottom + 4, left: coords.left });
        setOpen(true);
        setQuery('');
        setSelectedIndex(0);
      }
    };

    editor.on('update', handleSlash);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      editor.off('update', handleSlash);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [editor, open, query, selectedIndex, filtered, close]);

  useEffect(() => {
    if (!open) return;
    const handler = () => close();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open, close]);

  const select = useCallback(
    (item: SlashItem) => {
      if (!editor) return;
      const { from } = editor.state.selection;
      const slashPos = from - query.length - 1;
      editor.chain().deleteRange({ from: slashPos, to: from }).run();
      item.action(editor);
      close();
    },
    [editor, query, close],
  );

  return { open, position, filtered, selectedIndex, select };
}

export function SlashMenu({
  open,
  position,
  filtered,
  selectedIndex,
  select,
}: {
  open: boolean;
  position: { top: number; left: number };
  filtered: SlashItem[];
  selectedIndex: number;
  select: (item: SlashItem) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const el = menuRef.current;
    const rect = el.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${position.top - rect.height - 24}px`;
    }
  }, [open, position]);

  if (!open || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="md-slash-menu"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
      }}
    >
      {filtered.map((item, i) => (
        <button
          key={item.label}
          className={i === selectedIndex ? 'is-selected' : ''}
          onMouseDown={(e) => {
            e.preventDefault();
            select(item);
          }}
        >
          <span className="md-slash-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
