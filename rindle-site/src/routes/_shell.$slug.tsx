// A post view (`/:slug`): one post resolved by slug, its pre-rendered `html` body dropped in. The
// single detail query is seeded by the loader for first paint (SSR — this is what makes the post
// server-rendered), then the wasm engine owns the live read after hydration. The slug matches the
// original site's URL scheme (`/YYYY-MM-DD-title`), so in-body internal links keep working.
//
// It nests under `_shell`, so the blog list stays subscribed (warm) the whole time a post is open —
// Back returns to `/` with synchronous rows and restored scroll.

import { useRef } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import type { DehydratedState } from "@rindle/client";

import { postQuery } from "../components/PostView.queries.ts";
import { Pills } from "../components/Pills.tsx";
import { formatDate, parseList } from "../lib/format.ts";

export const Route = createFileRoute("/_shell/$slug")({
  loader: async ({ params }): Promise<{ rindle: DehydratedState }> => {
    if (!import.meta.env.SSR) return { rindle: {} };
    const { preloadRindle } = await import("../ssr.ts");
    return { rindle: await preloadRindle([postQuery(params.slug)]) };
  },
  component: PostView,
});

function PostView() {
  const { slug } = Route.useParams();
  const [post, { status }] = useRoot(postQuery, slug);
  const renderedPostRef = useRef({ slug, post });

  // Keep the SSR row visible across the same-slug seed→live handoff. The normalized local view can
  // be empty for one render after the seed retires but before its catch-up row lands; replacing the
  // article with "Loading post…" in that gap causes a visible flash. Never carry a row to a different
  // slug, and always accept a complete result (including a real deletion / not-found response).
  if (renderedPostRef.current.slug !== slug || post || status === "complete") {
    renderedPostRef.current = { slug, post };
  }
  const renderedPost = renderedPostRef.current.post;

  if (!renderedPost) {
    return (
      <section className="app-page">
        <p className="app-empty">{status === "complete" ? "Post not found." : "Loading post…"}</p>
        <Link to="/" className="app-link">← Back to all posts</Link>
      </section>
    );
  }

  const tags = parseList(renderedPost.tags);
  const concern = parseList(renderedPost.concern);
  const authors = parseList(renderedPost.author);

  return (
    <article className="app-page post">
      <div className="app-breadcrumb">
        <Link to="/">Writing</Link> <span aria-hidden="true">/</span> <span>{renderedPost.title}</span>
      </div>

      <header className="post-head">
        <h1 className="post-title">{renderedPost.title}</h1>
        <div className="post-meta">
          {renderedPost.date ? <time dateTime={renderedPost.date}>{formatDate(renderedPost.date)}</time> : null}
          {authors.length > 0 ? <span className="post-authors">{authors.join(", ")}</span> : null}
          {renderedPost.form ? <span className="post-form">{renderedPost.form}</span> : null}
        </div>
        <Pills tags={tags} concern={concern} form={renderedPost.form} kind={renderedPost.kind} />
      </header>

      {/* The body is pre-rendered HTML from the seed step (marked). MDX / live rendering / transclusion
          come later; for static markdown posts this is the server-rendered article. */}
      <div className="post-body" dangerouslySetInnerHTML={{ __html: renderedPost.html }} />

      <footer className="post-foot">
        <Link to="/" className="app-link">← Back to all posts</Link>
      </footer>
    </article>
  );
}
