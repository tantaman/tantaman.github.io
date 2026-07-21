import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ulid } from "ulid";

import { authClient } from "../auth-client.ts";
import {
  postEditorFacetOptionsQuery,
  postEditorMetadataOptionsQuery,
  postEditorQuery,
} from "../components/PostEditor.queries.ts";
import {
  ensureTitleHeading,
  estimateReadingMinutes,
  firstMarkdownImage,
  renderMarkdown,
  withoutTitleHeading,
} from "../lib/markdown.ts";
import { parseList } from "../lib/format.ts";
import { app } from "../rindle-client.ts";

interface WriteSearch {
  post?: string;
}

interface PostMetadata {
  date: string;
  description: string;
  thesis: string;
  tags: string[];
  concerns: string[];
  form: string;
  kind: string;
  pinned: boolean;
}

interface DerivedDocument {
  markdown: string;
  title: string;
  image: string | null;
}

const EMPTY_QUERY_SLUG = "__new-post__";
const EMPTY_DERIVED: DerivedDocument = { markdown: "", title: "", image: null };
const BLANK_DOCUMENT = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 } },
    { type: "paragraph" },
  ],
};

const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4] },
    link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
  }),
  Image.configure({ allowBase64: false }),
  Placeholder.configure({
    includeChildren: true,
    placeholder: ({ node }) =>
      node.type.name === "heading" && node.attrs.level === 1
        ? "Post title"
        : "Start writing…",
  }),
  Markdown.configure({ markedOptions: { gfm: true } }),
];

export const Route = createFileRoute("/_shell/write")({
  validateSearch: (search: Record<string, unknown>): WriteSearch => ({
    post: typeof search.post === "string" && search.post.length <= 200 ? search.post : undefined,
  }),
  component: WritePost,
});

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyMetadata(): PostMetadata {
  return {
    date: today(),
    description: "",
    thesis: "",
    tags: [],
    concerns: [],
    form: "essay",
    kind: "",
    pinned: false,
  };
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

function titleFromEditor(editor: Editor): string {
  const first = editor.state.doc.firstChild;
  return first?.type.name === "heading" && first.attrs.level === 1
    ? first.textContent.trim()
    : "";
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function WritePost() {
  const { post: editSlug } = Route.useSearch();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <p className="app-empty">Opening the authoring desk…</p>;

  if (!session?.user) {
    return (
      <section className="author-page author-gate">
        <p className="login-kicker">authoring</p>
        <h1>Sign in to write.</h1>
        <Link className="app-link" to="/login">Open sign in →</Link>
      </section>
    );
  }

  if (session.user.role !== "admin") {
    return (
      <section className="author-page author-gate">
        <p className="login-kicker">authoring</p>
        <h1>This desk belongs to @tantaman.</h1>
        <Link className="app-link" to="/">Return to the posts →</Link>
      </section>
    );
  }

  return <PostAuthoringDesk editSlug={editSlug} />;
}

function PostAuthoringDesk({ editSlug }: { editSlug?: string }) {
  const navigate = Route.useNavigate();
  const [existing, { status }] = useRoot(postEditorQuery, editSlug ?? EMPTY_QUERY_SLUG);
  const [facetRows] = useRoot(postEditorFacetOptionsQuery, {});
  const [metadataRows] = useRoot(postEditorMetadataOptionsQuery, {});
  const [metadata, setMetadata] = useState<PostMetadata>(emptyMetadata);
  const [error, setError] = useState<string | null>(null);
  const loadedDocument = useRef<string | null>(null);

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: BLANK_DOCUMENT,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-document",
        spellcheck: "true",
      },
    },
  });

  const derived = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return EMPTY_DERIVED;
      const markdown = current.getMarkdown();
      return {
        markdown,
        title: titleFromEditor(current),
        image: firstMarkdownImage(markdown),
      };
    },
  }) ?? EMPTY_DERIVED;

  useEffect(() => {
    if (!editor) return;
    const key = editSlug ?? EMPTY_QUERY_SLUG;
    if (loadedDocument.current === key) return;

    if (!editSlug) {
      editor.commands.setContent(BLANK_DOCUMENT);
      setMetadata(emptyMetadata());
      loadedDocument.current = key;
      return;
    }

    if (!existing) return;
    editor.commands.setContent(ensureTitleHeading(existing.body, existing.title), {
      contentType: "markdown",
    });
    setMetadata({
      date: existing.date ?? today(),
      description: existing.description,
      thesis: existing.thesis ?? "",
      tags: parseList(existing.tags),
      concerns: parseList(existing.concern),
      form: existing.form ?? "",
      kind: existing.kind ?? "",
      pinned: existing.pinned === 1,
    });
    loadedDocument.current = key;
  }, [editSlug, editor, existing]);

  const tagOptions = useMemo(
    () => unique(facetRows.filter((row) => row.facet === "tag").map((row) => row.value)),
    [facetRows],
  );
  const concernOptions = useMemo(
    () => unique(facetRows.filter((row) => row.facet === "concern").map((row) => row.value)),
    [facetRows],
  );
  const formOptions = useMemo(
    () => unique(["essay", ...metadataRows.map((row) => row.form)]),
    [metadataRows],
  );
  const kindOptions = useMemo(
    () => unique(metadataRows.map((row) => row.kind)),
    [metadataRows],
  );

  const resolvedSlug = editSlug ?? slugify(`${metadata.date}-${derived.title}`);

  if (editSlug && !existing && status !== "complete") {
    return <p className="app-empty">Loading draft…</p>;
  }

  if (editSlug && !existing) {
    return (
      <section className="author-page author-gate">
        <p className="login-kicker">authoring</p>
        <h1>Post not found.</h1>
        <Link className="app-link" to="/write">Start a new post →</Link>
      </section>
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      if (!editor) throw new Error("The editor is still starting.");
      const markdown = editor.getMarkdown().trim();
      const title = titleFromEditor(editor);
      if (!title) throw new Error("Start the document with a title heading.");
      const slug = editSlug ?? slugify(`${metadata.date}-${title}`);
      if (!slug) throw new Error("The title could not produce a valid URL slug.");

      const image = firstMarkdownImage(markdown);
      const bodyUnchanged = Boolean(existing && existing.body.trim() === markdown);
      const revision = bodyUnchanged && existing?.contentRevision
        ? existing.contentRevision
        : ulid();
      const facets = [
        ...metadata.tags.map((value, position) => ({
          id: ulid(),
          facet: "tag" as const,
          value,
          position,
        })),
        ...metadata.concerns.map((value, position) => ({
          id: ulid(),
          facet: "concern" as const,
          value,
          position,
        })),
      ];

      app.mutate.savePost({
        post: {
          id: slug,
          title,
          date: metadata.date,
          publishedAt: Date.parse(`${metadata.date}T00:00:00Z`),
          description: metadata.description.trim(),
          thesis: metadata.thesis.trim() || null,
          tags: JSON.stringify(metadata.tags),
          concern: JSON.stringify(metadata.concerns),
          form: metadata.form.trim() || null,
          kind: metadata.kind.trim() || null,
          image,
          html: renderMarkdown(withoutTitleHeading(markdown)),
          body: markdown,
          cardImage: image,
          pinned: metadata.pinned ? 1 : 0,
          readingMinutes: estimateReadingMinutes(markdown),
          color: bodyUnchanged ? existing?.color ?? null : null,
          contentRevision: revision,
          colorRevision: bodyUnchanged ? existing?.colorRevision ?? null : null,
          colorProjectionVersion: bodyUnchanged
            ? existing?.colorProjectionVersion ?? null
            : null,
          colorStatus: bodyUnchanged ? existing?.colorStatus ?? "pending" : "pending",
        },
        facets,
        postAuthorId: ulid(),
      });

      await navigate({ to: "/$slug", params: { slug } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the post.");
    }
  }

  return (
    <section className="author-page">
      <div className="app-breadcrumb">
        <Link to="/">Writing</Link> <span aria-hidden="true">/</span>{" "}
        <span>{editSlug ? "Edit post" : "New post"}</span>
      </div>

      <header className="author-head">
        <div>
          <p className="login-kicker">authoring as @tantaman</p>
          <h1>{editSlug ? "Edit post" : "New post"}</h1>
        </div>
        {editSlug ? (
          <Link className="app-link" to="/$slug" params={{ slug: editSlug }}>View post ↗</Link>
        ) : null}
      </header>

      <form className="author-form" onSubmit={(event) => void save(event)}>
        <div className="author-workspace">
          <main className="author-document-shell">
            <EditorToolbar editor={editor} />
            {editor ? <EditorContent editor={editor} /> : <p className="app-empty">Starting editor…</p>}
            <p className="author-shortcuts">
              Markdown shortcuts work as you type: <kbd>#</kbd> title, <kbd>##</kbd> heading,
              <kbd>-</kbd> list, <kbd>&gt;</kbd> quote, <kbd>```</kbd> code.
            </p>
          </main>

          <aside className="author-sidebar">
            <section className="author-panel author-derived">
              <div className="author-panel-heading">
                <h2>Published as</h2>
                <span>automatic</span>
              </div>
              <dl>
                <div><dt>Date</dt><dd>{metadata.date}</dd></div>
                <div><dt>URL</dt><dd>/{resolvedSlug || "waiting-for-title"}</dd></div>
                <div>
                  <dt>Image</dt>
                  <dd>{derived.image ? "first document image" : "none yet"}</dd>
                </div>
              </dl>
              {derived.image ? <img src={derived.image} alt="" /> : null}
            </section>

            <section className="author-panel">
              <div className="author-panel-heading"><h2>Taxonomy</h2></div>
              <MultiTypeahead
                label="Tags"
                values={metadata.tags}
                options={tagOptions}
                onChange={(tags) => setMetadata((current) => ({ ...current, tags }))}
              />
              <MultiTypeahead
                label="Concerns"
                values={metadata.concerns}
                options={concernOptions}
                onChange={(concerns) => setMetadata((current) => ({ ...current, concerns }))}
              />
              <TypeaheadField
                label="Form"
                value={metadata.form}
                options={formOptions}
                onChange={(form) => setMetadata((current) => ({ ...current, form }))}
              />
              <TypeaheadField
                label="Kind"
                value={metadata.kind}
                options={kindOptions}
                onChange={(kind) => setMetadata((current) => ({ ...current, kind }))}
              />
            </section>

            <section className="author-panel">
              <div className="author-panel-heading"><h2>Presentation</h2></div>
              <label className="author-text-field">
                <span>Summary</span>
                <textarea
                  rows={3}
                  maxLength={2_000}
                  value={metadata.description}
                  onChange={(event) =>
                    setMetadata((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label className="author-text-field">
                <span>Featured thesis</span>
                <textarea
                  rows={3}
                  maxLength={2_000}
                  value={metadata.thesis}
                  onChange={(event) =>
                    setMetadata((current) => ({ ...current, thesis: event.target.value }))
                  }
                />
              </label>
              <label className="author-check">
                <input
                  type="checkbox"
                  checked={metadata.pinned}
                  onChange={(event) =>
                    setMetadata((current) => ({ ...current, pinned: event.target.checked }))
                  }
                />
                <span>Pin to top</span>
              </label>
            </section>

            {error ? <p className="login-error">{error}</p> : null}
            <div className="author-actions">
              <button type="submit">{editSlug ? "Save revision" : "Publish post"}</button>
              {editSlug ? (
                <Link className="app-link" to="/$slug" params={{ slug: editSlug }}>Cancel</Link>
              ) : (
                <Link className="app-link" to="/">Cancel</Link>
              )}
            </div>
          </aside>
        </div>
      </form>
    </section>
  );
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const [showImage, setShowImage] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      heading2: current?.isActive("heading", { level: 2 }) ?? false,
      heading3: current?.isActive("heading", { level: 3 }) ?? false,
      bullet: current?.isActive("bulletList") ?? false,
      ordered: current?.isActive("orderedList") ?? false,
      quote: current?.isActive("blockquote") ?? false,
      code: current?.isActive("codeBlock") ?? false,
    }),
  });

  function insertImage() {
    const src = imageUrl.trim();
    if (!editor || !src) return;
    editor.chain().focus().setImage({ src }).run();
    setImageUrl("");
    setShowImage(false);
  }

  if (!editor) return <div className="tiptap-toolbar tiptap-toolbar-loading" />;

  return (
    <div className="tiptap-toolbar" aria-label="Formatting toolbar">
      <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>↶</ToolbarButton>
      <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>↷</ToolbarButton>
      <span className="tiptap-divider" />
      <ToolbarButton active={active?.bold} label="Bold" onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></ToolbarButton>
      <ToolbarButton active={active?.italic} label="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolbarButton>
      <ToolbarButton active={active?.heading2} label="Heading" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
      <ToolbarButton active={active?.heading3} label="Subheading" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
      <span className="tiptap-divider" />
      <ToolbarButton active={active?.bullet} label="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}>• list</ToolbarButton>
      <ToolbarButton active={active?.ordered} label="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. list</ToolbarButton>
      <ToolbarButton active={active?.quote} label="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()}>“ ”</ToolbarButton>
      <ToolbarButton active={active?.code} label="Code block" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>&lt;/&gt;</ToolbarButton>
      <ToolbarButton label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>―</ToolbarButton>
      <ToolbarButton active={showImage} label="Insert image" onClick={() => setShowImage((value) => !value)}>image</ToolbarButton>
      {showImage ? (
        <div className="tiptap-image-control">
          <input
            autoFocus
            type="url"
            value={imageUrl}
            placeholder="Paste image URL"
            aria-label="Image URL"
            onChange={(event) => setImageUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                insertImage();
              }
              if (event.key === "Escape") setShowImage(false);
            }}
          />
          <button type="button" onClick={insertImage}>Insert</button>
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  active = false,
  children,
  label,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  label: string;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      className={active ? "is-active" : undefined}
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MultiTypeahead({
  label,
  onChange,
  options,
  values,
}: {
  label: string;
  onChange(values: string[]): void;
  options: string[];
  values: string[];
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedValues = new Set(values.map((value) => value.toLowerCase()));
  const filtered = options
    .filter((option) => !normalizedValues.has(option.toLowerCase()))
    .filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 8);
  const exact = options.find((option) => option.toLowerCase() === query.trim().toLowerCase());
  const canCreate = Boolean(query.trim()) && !exact && !normalizedValues.has(query.trim().toLowerCase());
  const menu = canCreate ? [...filtered, query.trim()] : filtered;

  function add(raw: string) {
    const clean = raw.trim();
    if (!clean || normalizedValues.has(clean.toLowerCase())) return;
    const canonical = options.find((option) => option.toLowerCase() === clean.toLowerCase()) ?? clean;
    onChange([...values, canonical]);
    setQuery("");
    setActiveIndex(0);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && menu.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % menu.length);
    } else if (event.key === "ArrowUp" && menu.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index - 1 + menu.length) % menu.length);
    } else if (event.key === "Enter" && (query.trim() || menu[activeIndex])) {
      event.preventDefault();
      add(menu[activeIndex] ?? query);
    } else if (event.key === "Backspace" && !query && values.length > 0) {
      onChange(values.slice(0, -1));
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="typeahead-field">
      <label htmlFor={`${listId}-input`}>{label}</label>
      <div className="typeahead-box" onClick={() => setOpen(true)}>
        {values.map((value) => (
          <span className="typeahead-chip" key={value}>
            {value}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(values.filter((item) => item !== value))}
            >×</button>
          </span>
        ))}
        <input
          id={`${listId}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open && menu.length > 0}
          value={query}
          placeholder={values.length > 0 ? "Add…" : "Type to filter…"}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 100)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && menu.length > 0 ? (
        <div className="typeahead-menu" id={listId} role="listbox">
          {menu.map((option, index) => (
            <button
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "is-active" : undefined}
              key={`${option}-${index}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => add(option)}
            >
              {canCreate && option === query.trim() ? `Add “${option}”` : option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TypeaheadField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange(value: string): void;
  options: string[];
  value: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const filtered = options
    .filter((option) => option.toLowerCase().includes(value.trim().toLowerCase()))
    .slice(0, 8);

  return (
    <div className="typeahead-field">
      <label htmlFor={`${listId}-input`}>{label}</label>
      <input
        id={`${listId}-input`}
        className="typeahead-single"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && filtered.length > 0}
        value={value}
        placeholder="Type to filter…"
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 100)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      />
      {open && filtered.length > 0 ? (
        <div className="typeahead-menu" id={listId} role="listbox">
          {filtered.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option === value}
              key={option}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
