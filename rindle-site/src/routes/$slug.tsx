// A post view (`/:slug`): one post resolved by slug, its pre-rendered `html` body dropped in. The
// single detail query is seeded by the loader for first paint (SSR — this is what makes the post
// server-rendered), then the wasm engine owns the live read after hydration. The slug matches the
// original site's URL scheme (`/YYYY-MM-DD-title`), so in-body internal links keep working.

import { Link, createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import type { DehydratedState } from "@rindle/client";

import { postQuery } from "../components/PostView.queries.ts";
import { formatDate, parseList } from "../lib/format.ts";

export const Route = createFileRoute("/$slug")({
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

  if (!post) {
    return (
      <section className="app-page">
        <p className="app-empty">{status === "complete" ? "Post not found." : "Loading post…"}</p>
        <Link to="/" className="app-link">← Back to all posts</Link>
      </section>
    );
  }

  const tags = parseList(post.tags);
  const authors = parseList(post.author);

  return (
    <article className="app-page post">
      <div className="app-breadcrumb">
        <Link to="/">Writing</Link> <span aria-hidden="true">/</span> <span>{post.title}</span>
      </div>

      <header className="post-head">
        <h1 className="post-title">{post.title}</h1>
        <div className="post-meta">
          {post.date ? <time dateTime={post.date}>{formatDate(post.date)}</time> : null}
          {authors.length > 0 ? <span className="post-authors">{authors.join(", ")}</span> : null}
          {post.form ? <span className="post-form">{post.form}</span> : null}
        </div>
        {tags.length > 0 ? (
          <ul className="post-tags">
            {tags.map((tag) => (
              <li key={tag} className="post-tag">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      {post.image ? <img className="post-hero" src={post.image} alt="" /> : null}

      {/* The body is pre-rendered HTML from the seed step (marked). MDX / live rendering / transclusion
          come later; for static markdown posts this is the server-rendered article. */}
      <div className="post-body" dangerouslySetInnerHTML={{ __html: post.html }} />

      <footer className="post-foot">
        <Link to="/" className="app-link">← Back to all posts</Link>
      </footer>
    </article>
  );
}
