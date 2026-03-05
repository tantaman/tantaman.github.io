import {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Markdown } from 'tiptap-markdown';
import { common, createLowlight } from 'lowlight';
import { AuthContext } from './App';
import { getPost, createPost, updatePost } from './api';
import { BubbleToolbar } from './BubbleToolbar';
import { SlashMenu, useSlashMenu } from './SlashMenu';
import type { PostFrontmatter } from './types';

const lowlight = createLowlight(common);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function Editor({ postId }: { postId?: number }) {
  const { secret } = useContext(AuthContext);
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [frontmatter, setFrontmatter] = useState<PostFrontmatter>({});
  const [showMeta, setShowMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(!!postId);
  const [error, setError] = useState('');
  const [currentId, setCurrentId] = useState<number | undefined>(postId);
  const slugManuallyEdited = useRef(false);
  const loadedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: 'Start writing... (type / for commands)',
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Markdown,
    ],
    editorProps: {
      attributes: {
        spellcheck: 'true',
      },
    },
  });

  const slashMenu = useSlashMenu(editor);

  // Load existing post
  useEffect(() => {
    if (!postId || !secret || !editor || loadedRef.current) return;
    getPost(secret, postId)
      .then((post) => {
        const md = post.title
          ? `# ${post.title}\n\n${post.body || ''}`
          : post.body || '';
        editor.commands.setContent(
          editor.storage.markdown.parser.parse(md),
        );
        setSlug(post.slug);
        setStatus(post.status);
        setFrontmatter(post.frontmatter || {});
        slugManuallyEdited.current = true;
        loadedRef.current = true;
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [postId, secret, editor]);

  // Auto-generate slug from first H1
  useEffect(() => {
    if (!editor || slugManuallyEdited.current) return;
    const handleUpdate = () => {
      if (slugManuallyEdited.current) return;
      const json = editor.getJSON();
      const h1 = json.content?.find(
        (n: any) => n.type === 'heading' && n.attrs?.level === 1,
      );
      if (h1) {
        const text = h1.content
          ?.map((c: any) => c.text || '')
          .join('') || '';
        if (text) setSlug(slugify(text));
      }
    };
    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  const handleSave = useCallback(async () => {
    if (!editor || !secret) return;

    const markdown = editor.storage.markdown.getMarkdown() as string;

    // Extract title from first H1
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

    // Body is everything after the first H1 line
    let body = markdown;
    if (titleMatch) {
      const idx = markdown.indexOf(titleMatch[0]);
      body = markdown.slice(idx + titleMatch[0].length).replace(/^\n+/, '');
    }

    if (!slug) {
      setSaveMsg('Slug required');
      return;
    }

    setSaving(true);
    setSaveMsg('');

    try {
      if (currentId) {
        await updatePost(secret, currentId, {
          title,
          slug,
          body,
          frontmatter,
          status,
        });
        setSaveMsg('Saved');
      } else {
        const post = await createPost(secret, {
          title,
          slug,
          body,
          frontmatter,
        });
        setCurrentId(post.id);
        location.hash = `edit-${post.id}`;
        setSaveMsg('Created');
      }
    } catch (e: any) {
      setSaveMsg(e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }, [editor, secret, slug, status, frontmatter, currentId]);

  // Cmd/Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  if (loading) return <div className="pe-loading">Loading...</div>;
  if (error) return <div className="pe-error">{error}</div>;

  return (
    <div className="pe-editor">
      <div className="pe-topbar">
        <a href="#" className="pe-topbar-back">
          ← Posts
        </a>
        <input
          className="pe-slug-input"
          placeholder="post-slug"
          value={slug}
          onChange={(e) => {
            slugManuallyEdited.current = true;
            setSlug(e.target.value);
          }}
        />
        <select
          className="pe-status-select"
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as 'draft' | 'published')
          }
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <button
          className="pe-meta-toggle"
          data-active={showMeta}
          onClick={() => setShowMeta(!showMeta)}
        >
          Meta
        </button>
        <button
          className="pe-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saveMsg && <span className="pe-save-status">{saveMsg}</span>}
      </div>

      {showMeta && (
        <FrontmatterPanel
          frontmatter={frontmatter}
          onChange={setFrontmatter}
        />
      )}

      <div className="pe-editor-area">
        {editor && <BubbleToolbar editor={editor} />}
        <EditorContent editor={editor} />
        <SlashMenu {...slashMenu} />
      </div>
    </div>
  );
}

function FrontmatterPanel({
  frontmatter,
  onChange,
}: {
  frontmatter: PostFrontmatter;
  onChange: (fm: PostFrontmatter) => void;
}) {
  const update = (key: keyof PostFrontmatter, value: any) => {
    onChange({ ...frontmatter, [key]: value });
  };

  const parseArray = (val: string): string[] =>
    val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  return (
    <div className="pe-frontmatter">
      <div className="pe-fm-field pe-fm-wide">
        <label>Tags (comma-separated)</label>
        <input
          value={(frontmatter.tags || []).join(', ')}
          onChange={(e) => update('tags', parseArray(e.target.value))}
        />
      </div>
      <div className="pe-fm-field pe-fm-wide">
        <label>Description</label>
        <input
          value={frontmatter.description || ''}
          onChange={(e) => update('description', e.target.value || undefined)}
        />
      </div>
      <div className="pe-fm-field pe-fm-wide">
        <label>Description</label>
        <textarea
          value={frontmatter.description || ''}
          onChange={(e) => update('description', e.target.value || undefined)}
        />
      </div>
      <div className="pe-fm-field">
        <label>Date</label>
        <input
          type="date"
          value={frontmatter.date || ''}
          onChange={(e) => update('date', e.target.value || undefined)}
        />
      </div>
      <div className="pe-fm-field">
        <label>Layout</label>
        <select
          value={frontmatter.layout || 'default'}
          onChange={(e) =>
            update(
              'layout',
              e.target.value === 'default' ? undefined : e.target.value,
            )
          }
        >
          <option value="default">default</option>
          <option value="mirrorRoom">mirrorRoom</option>
          <option value="chat">chat</option>
          <option value="bare">bare</option>
        </select>
      </div>
      <div className="pe-fm-field">
        <label>Concern (comma-separated)</label>
        <input
          value={(frontmatter.concern || []).join(', ')}
          onChange={(e) => update('concern', parseArray(e.target.value))}
        />
      </div>
      <div className="pe-fm-field">
        <label>Form</label>
        <select
          value={frontmatter.form || ''}
          onChange={(e) => update('form', e.target.value || undefined)}
        >
          <option value="">inferred</option>
          <option value="essay">essay</option>
          <option value="story">story</option>
          <option value="chat">chat</option>
          <option value="interactive">interactive</option>
          <option value="meditation">meditation</option>
          <option value="prophecy">prophecy</option>
        </select>
      </div>
      <div className="pe-fm-field">
        <label>Image URL</label>
        <input
          value={frontmatter.image || ''}
          onChange={(e) => update('image', e.target.value || undefined)}
        />
      </div>
      <div className="pe-fm-field pe-fm-checkbox">
        <input
          type="checkbox"
          id="fm-wide"
          checked={!!frontmatter.wide}
          onChange={(e) =>
            update('wide', e.target.checked || undefined)
          }
        />
        <label htmlFor="fm-wide">Wide layout</label>
      </div>
    </div>
  );
}
