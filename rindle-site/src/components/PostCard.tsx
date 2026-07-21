// A single post on the blog index: title (linking to the post), date, a short description, and its
// tags. Reads its data through the `PostCard` fragment — a narrow local read opened with no new server
// subscription.

import { Link } from "@tanstack/react-router";
import { useFragment } from "@rindle/react";

import { formatDate, parseList } from "../lib/format.ts";
import { PostCardFragment } from "./PostCard.queries.ts";
import type { PostCardRef } from "./PostCard.queries.ts";

export function PostCard({ post }: { post: PostCardRef }) {
  const data = useFragment(PostCardFragment, post);
  if (!data) return null;

  const tags = parseList(data.tags);

  return (
    <li className="post-card">
      <Link to="/$slug" params={{ slug: data.id }} className="post-card-link">
        <h2 className="post-card-title">{data.title}</h2>
      </Link>
      <div className="post-card-meta">
        {data.date ? <time dateTime={data.date}>{formatDate(data.date)}</time> : null}
        {data.form ? <span className="post-form">{data.form}</span> : null}
      </div>
      {data.description ? <p className="post-card-desc">{data.description}</p> : null}
      {tags.length > 0 ? (
        <ul className="post-tags">
          {tags.map((tag) => (
            <li key={tag} className="post-tag">
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
