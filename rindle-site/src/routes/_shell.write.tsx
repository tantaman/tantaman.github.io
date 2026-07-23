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
import { useHydrated } from "../lib/hydration.ts";
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
import { app, currentQueryContext } from "../rindle-client.ts";
import { rindle } from "../rindle-tanstack.ts";

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
const TITLE_CURSOR_POSITION = 1;
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
  loaderDeps: ({ search }) => ({ post: search.post }),
  loader: rindle.loader({
    query: ({ deps }) => {
      const post = typeof deps.post === "string" ? deps.post : undefined;
      const context = currentQueryContext();
      return [
        ...(post ? [postEditorQuery(post, context)] : []),
        postEditorFacetOptionsQuery({}, context),
        postEditorMetadataOptionsQuery({}, context),
      ];
    },
    // The editor cannot safely initialize from a row that lacks its raw body or metadata options.
    until: "complete",
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
  const hydrated = useHydrated();

  if (!hydrated || isPending) return <p className="app-empty">Opening the authoring desk…</p>;

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
  const context = currentQueryContext();
  const [existing, { status }] = useRoot(postEditorQuery, editSlug ?? EMPTY_QUERY_SLUG, context);
  const [facetRows] = useRoot(postEditorFacetOptionsQuery, {}, context);
  const [metadataRows] = useRoot(postEditorMetadataOptionsQuery, {}, context);
  const [metadata, setMetadata] = useState<PostMetadata>(emptyMetadata);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const loadedDocument = useRef<string | null>(null);

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: BLANK_DOCUMENT,
    // Let Tiptap apply focus after EditorContent has mounted. Focusing from the loading effect can
    // target its detached editor view and leave a new draft's cursor in the body paragraph.
    autofocus: editSlug ? false : TITLE_CURSOR_POSITION,
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
      editor.chain().setContent(BLANK_DOCUMENT).focus(TITLE_CURSOR_POSITION).run();
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

  useEffect(() => {
    if (!settingsOpen) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen]);

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

  async function deleteCurrentPost() {
    if (!editSlug || !deleteConfirming || deleting) return;
    setError(null);
    setDeleting(true);
    try {
      app.mutate.deletePost({ id: editSlug });
      await navigate({ to: "/" });
    } catch (cause) {
      setDeleting(false);
      setError(cause instanceof Error ? cause.message : "Could not delete the post.");
    }
  }

  return (
    <section className="author-page">
      <header className="author-commandbar">
        <div className="author-commandbar-context">
          <button
            className="author-commandbar-settings"
            type="button"
            aria-label={settingsOpen ? "Close post settings" : "Open post settings"}
            aria-controls="post-settings"
            aria-expanded={settingsOpen}
            title="Post settings"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <span className="author-sidebar-toggle-icon" aria-hidden="true" />
          </button>
          <Link to="/">Writing</Link>
          <span aria-hidden="true">/</span>
          <span>{derived.title || (editSlug ? "Edit post" : "Untitled")}</span>
        </div>
        <div className="author-commandbar-actions">
          {editSlug ? (
            <Link className="app-link" to="/$slug" params={{ slug: editSlug }}>View post ↗</Link>
          ) : null}
          {editSlug ? (
            <Link className="app-link" to="/$slug" params={{ slug: editSlug }}>Cancel</Link>
          ) : (
            <Link className="app-link" to="/">Cancel</Link>
          )}
          <button
            className="author-commandbar-publish"
            type="submit"
            form="post-author-form"
          >{editSlug ? "Save" : "Publish"}</button>
        </div>
      </header>

      {error ? <p className="author-error" role="alert">{error}</p> : null}

      <form
        className="author-form"
        id="post-author-form"
        onSubmit={(event) => void save(event)}
      >
        <div className={`author-workspace${settingsOpen ? " is-settings-open" : ""}`}>
          <main className="author-document-shell">
            {editor ? <EditorContent editor={editor} /> : <p className="app-empty">Starting editor…</p>}
          </main>

          <aside
            className={`author-settings-drawer${settingsOpen ? " is-open" : ""}`}
            id="post-settings"
            aria-label="Post settings"
            aria-hidden={!settingsOpen}
            inert={!settingsOpen}
          >
            <div className="author-sidebar">
              <div className="author-sidebar-heading">
                <div>
                  <p className="login-kicker">Post settings</p>
                  <p>Everything outside the document.</p>
                </div>
                <button
                  className="author-sidebar-close"
                  type="button"
                  aria-label="Close post settings"
                  title="Close post settings"
                  onClick={() => setSettingsOpen(false)}
                >»</button>
              </div>

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

              {editSlug ? (
                <section className="author-panel author-delete-panel">
                  <div className="author-panel-heading"><h2>Danger zone</h2></div>
                  {deleteConfirming ? (
                    <div className="author-delete-confirm" role="alert">
                      <p>
                        Delete <strong>“{derived.title || existing?.title || editSlug}”</strong>?
                        This cannot be undone.
                      </p>
                      <div>
                        <button
                          autoFocus
                          className="author-delete-confirm-button"
                          type="button"
                          disabled={deleting}
                          onClick={() => void deleteCurrentPost()}
                        >{deleting ? "Deleting…" : "Delete permanently"}</button>
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() => setDeleteConfirming(false)}
                        >Keep post</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p>Remove this post and its taxonomy from the site.</p>
                      <button
                        className="author-delete-trigger"
                        type="button"
                        onClick={() => setDeleteConfirming(true)}
                      >Delete post…</button>
                    </>
                  )}
                </section>
              ) : null}

            </div>
          </aside>
        </div>
      </form>
    </section>
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
