// A single post on the blog index: title (linking to the post), date, a short description, and its
// taxonomy pills. Reads its data through the `PostCard` fragment — a narrow local read opened with no
// new server subscription.

import { Link } from "@tanstack/react-router";
import { useFragment } from "@rindle/react";

import { formatDate, parseList } from "../lib/format.ts";
import { Pills } from "./Pills.tsx";
import { PostCardFragment } from "./PostCard.queries.ts";
import type { PostCardRef } from "./PostCard.queries.ts";

export function PostCard({ post }: { post: PostCardRef }) {
  const data = useFragment(PostCardFragment, post);
  if (!data) return null;

  return (
    <li className="post-card">
      <Link to="/$slug" params={{ slug: data.id }} className="post-card-link">
        <h2 className="post-card-title">{data.title}</h2>
      </Link>
      {data.date ? (
        <div className="post-card-meta">
          <time dateTime={data.date}>{formatDate(data.date)}</time>
        </div>
      ) : null}
      {data.description ? <p className="post-card-desc">{data.description}</p> : null}
      {/* Cards show the lighter facet set (subject + form + kind); the full set — including concern —
          lives on the post detail page, so the busy index stays clean and avoids a term repeating
          across two facets. */}
      <Pills tags={parseList(data.tags)} form={data.form} kind={data.kind} maxTags={4} />
    </li>
  );
}
