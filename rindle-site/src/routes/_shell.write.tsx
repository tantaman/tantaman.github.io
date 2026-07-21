import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import { ulid } from "ulid";

import { authClient } from "../auth-client.ts";
import { postEditorQuery } from "../components/PostEditor.queries.ts";
import {
  estimateReadingMinutes,
  firstMarkdownImage,
  renderMarkdown,
} from "../lib/markdown.ts";
import { parseList } from "../lib/format.ts";
import { app } from "../rindle-client.ts";

interface WriteSearch {
  post?: string;
}

interface Draft {
  slug: string;
  title: string;
  date: string;
  description: string;
  thesis: string;
  tags: string;
  concern: string;
  form: string;
  kind: string;
  image: string;
  cardImage: string;
  pinned: boolean;
  body: string;
}

const EMPTY_QUERY_SLUG = "__new-post__";

export const Route = createFileRoute("/_shell/write")({
  validateSearch: (search: Record<string, unknown>): WriteSearch => ({
    post: typeof search.post === "string" && search.post.length <= 200 ? search.post : undefined,
  }),
  component: WritePost,
});

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(): Draft {
  return {
    slug: "",
    title: "",
    date: today(),
    description: "",
    thesis: "",
    tags: "",
    concern: "",
    form: "essay",
    kind: "",
    image: "",
    cardImage: "",
    pinned: false,
    body: "",
  };
}

function list(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
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
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editSlug) {
      if (loadedSlug !== EMPTY_QUERY_SLUG) {
        setDraft(emptyDraft());
        setLoadedSlug(EMPTY_QUERY_SLUG);
        setSlugTouched(false);
      }
      return;
    }
    if (!existing || loadedSlug === editSlug) return;
    setDraft({
      slug: existing.id,
      title: existing.title,
      date: existing.date ?? "",
      description: existing.description,
      thesis: existing.thesis ?? "",
      tags: parseList(existing.tags).join(", "),
      concern: parseList(existing.concern).join(", "),
      form: existing.form ?? "",
      kind: existing.kind ?? "",
      image: existing.image ?? "",
      cardImage: existing.cardImage ?? "",
      pinned: existing.pinned === 1,
      body: existing.body,
    });
    setLoadedSlug(editSlug);
    setSlugTouched(true);
  }, [editSlug, existing, loadedSlug]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

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
      const resolvedSlug =
        editSlug ?? (draft.slug.trim() || slugify(`${draft.date}-${draft.title}`));
      if (!resolvedSlug) throw new Error("Add a title or slug before publishing.");
      if (!draft.date) throw new Error("Choose a publication date.");

      const tags = list(draft.tags);
      const concerns = list(draft.concern);
      const bodyUnchanged = Boolean(existing && existing.body === draft.body);
      const revision = bodyUnchanged && existing?.contentRevision
        ? existing.contentRevision
        : ulid();
      const html = renderMarkdown(draft.body);
      const image = draft.image.trim() || null;
      const cardImage = draft.cardImage.trim() || image || firstMarkdownImage(draft.body);
      const facets = [
        ...tags.map((value, position) => ({ id: ulid(), facet: "tag" as const, value, position })),
        ...concerns.map((value, position) => ({
          id: ulid(),
          facet: "concern" as const,
          value,
          position,
        })),
      ];

      app.mutate.savePost({
        post: {
          id: resolvedSlug,
          title: draft.title.trim(),
          date: draft.date,
          publishedAt: Date.parse(`${draft.date}T00:00:00Z`),
          description: draft.description.trim(),
          thesis: draft.thesis.trim() || null,
          tags: JSON.stringify(tags),
          concern: JSON.stringify(concerns),
          form: draft.form.trim() || null,
          kind: draft.kind.trim() || null,
          image,
          html,
          body: draft.body,
          cardImage,
          pinned: draft.pinned ? 1 : 0,
          readingMinutes: estimateReadingMinutes(draft.body),
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

      await navigate({ to: "/$slug", params: { slug: resolvedSlug } });
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
          <h1>{editSlug ? "Revise the post" : "Write something worth keeping"}</h1>
        </div>
        {editSlug ? <Link className="app-link" to="/$slug" params={{ slug: editSlug }}>View post ↗</Link> : null}
      </header>

      <form className="author-form" onSubmit={(event) => void save(event)}>
        <div className="author-fields author-fields-primary">
          <label>
            <span>Title</span>
            <input
              required
              maxLength={300}
              value={draft.title}
              onChange={(event) => {
                const title = event.target.value;
                update("title", title);
                if (!editSlug && !slugTouched) update("slug", slugify(`${draft.date}-${title}`));
              }}
            />
          </label>
          <div className="author-field-row">
            <label>
              <span>Slug</span>
              <input
                required
                maxLength={200}
                readOnly={Boolean(editSlug)}
                value={draft.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  update("slug", slugify(event.target.value));
                }}
              />
            </label>
            <label>
              <span>Date</span>
              <input required type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} />
            </label>
          </div>
          <label>
            <span>Description</span>
            <textarea rows={2} maxLength={2000} value={draft.description} onChange={(event) => update("description", event.target.value)} />
          </label>
          <label>
            <span>Featured thesis</span>
            <textarea rows={2} maxLength={2000} value={draft.thesis} onChange={(event) => update("thesis", event.target.value)} />
          </label>
        </div>

        <div className="author-fields author-fields-meta">
          <div className="author-field-row">
            <label><span>Tags <small>comma-separated</small></span><input value={draft.tags} onChange={(event) => update("tags", event.target.value)} /></label>
            <label><span>Concerns <small>comma-separated</small></span><input value={draft.concern} onChange={(event) => update("concern", event.target.value)} /></label>
          </div>
          <div className="author-field-row author-field-row-thirds">
            <label><span>Form</span><input value={draft.form} onChange={(event) => update("form", event.target.value)} /></label>
            <label><span>Kind</span><input value={draft.kind} onChange={(event) => update("kind", event.target.value)} /></label>
            <label className="author-check"><input type="checkbox" checked={draft.pinned} onChange={(event) => update("pinned", event.target.checked)} /><span>Pin to top</span></label>
          </div>
          <div className="author-field-row">
            <label><span>Article image URL</span><input type="url" value={draft.image} onChange={(event) => update("image", event.target.value)} /></label>
            <label><span>Card image URL</span><input type="url" value={draft.cardImage} onChange={(event) => update("cardImage", event.target.value)} /></label>
          </div>
        </div>

        <div className="author-editor-grid">
          <label className="author-body-field">
            <span>Markdown</span>
            <textarea required spellCheck rows={28} maxLength={500000} value={draft.body} onChange={(event) => update("body", event.target.value)} />
          </label>
          <section className="author-preview" aria-label="Post preview">
            <span>Preview</span>
            <div className="post-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(draft.body) }} />
          </section>
        </div>

        {error ? <p className="login-error">{error}</p> : null}
        <div className="author-actions">
          <button type="submit">{editSlug ? "Save revision" : "Publish post"}</button>
          {editSlug ? (
            <Link className="app-link" to="/$slug" params={{ slug: editSlug }}>Cancel</Link>
          ) : (
            <Link className="app-link" to="/">Cancel</Link>
          )}
        </div>
      </form>
    </section>
  );
}
