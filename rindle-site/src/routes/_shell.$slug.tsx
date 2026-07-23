// A post view (`/:slug`): one post resolved by slug, its pre-rendered `html` body dropped in. The
// single detail query is seeded by the loader for first paint (SSR — this is what makes the post
// server-rendered), then the wasm engine owns the live read after hydration. The slug matches the
// original site's URL scheme (`/YYYY-MM-DD-title`), so in-body internal links keep working.
//
// It nests under `_shell`, so the blog list stays subscribed (warm) the whole time a post is open —
// Back returns to `/` with synchronous rows and restored scroll.

import { useEffect, useMemo, useRef } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import type { DehydratedState } from "@rindle/client";

import { postQuery } from "../components/PostView.queries.ts";
import { PostComments } from "../components/PostComments.tsx";
import {
  POST_COMMENTS_PAGE_SIZE,
  postCommentsQuery,
} from "../components/PostComments.queries.ts";
import { Pills } from "../components/Pills.tsx";
import { authClient } from "../auth-client.ts";
import { formatDate, parseList } from "../lib/format.ts";
import { useHydrated } from "../lib/hydration.ts";
import { ensureRindleQuery, handoffRindleQuery } from "../lib/rindle-prefetch.ts";

export const Route = createFileRoute("/_shell/$slug")({
  loader: {
    handler: async ({ params }): Promise<{ rindle: DehydratedState }> => {
      if (!import.meta.env.SSR) {
        // TanStack's existing intent preload calls this on hover/touch. A cold click awaits the same
        // deduped promise, so the old route stays rendered until the article row is locally readable.
        // Comments are non-critical and continue loading after the article mounts.
        await ensureRindleQuery(postQuery(params.slug));
        return { rindle: {} };
      }
      const { preloadRindle } = await import("../ssr.ts");
      return {
        rindle: await preloadRindle([
          postQuery(params.slug),
          postCommentsQuery({ postId: params.slug, limit: POST_COMMENTS_PAGE_SIZE }),
        ]),
      };
    },
    // A previously visited match is stale by default. Block its re-entry loader too; otherwise the
    // router's default stale-while-revalidate path can commit the post before a released query warms.
    staleReloadMode: "blocking",
  },
  component: PostView,
});

function PostView() {
  const { slug } = Route.useParams();
  const { data: session } = authClient.useSession();
  const hydrated = useHydrated();
  const [post, { status }] = useRoot(postQuery, slug);
  const detailQuery = useMemo(() => postQuery(slug), [slug]);
  const renderedPostRef = useRef({ slug, post });

  useEffect(() => {
    // `useRoot` has taken its retain by the time effects run. Drop the loader's overlapping lease;
    // direct SSR visits have no client-prefetch entry, so this is intentionally a no-op there.
    handoffRindleQuery(detailQuery);
  }, [detailQuery]);

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

      <PostComments postId={renderedPost.id} />

      <footer className="post-foot">
        <Link to="/" className="app-link">← Back to all posts</Link>
        {hydrated && session?.user.role === "admin" ? (
          <Link to="/write" search={{ post: slug }} className="app-link">Edit post →</Link>
        ) : null}
      </footer>
    </article>
  );
}
