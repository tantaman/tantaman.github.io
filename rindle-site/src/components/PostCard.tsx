// A single post on the blog index: title (linking to the post), date, a short description, and its
// taxonomy pills. Reads its data through the `PostCard` fragment — a narrow local read opened with no
// new server subscription.

import { Link } from "@tanstack/react-router";
import { useFragment } from "@rindle/react";

import { parseList } from "../lib/format.ts";
import { Pills } from "./Pills.tsx";
import { PostCardFragment } from "./PostCard.queries.ts";
import type { PostCardRef } from "./PostCard.queries.ts";

export function PostCard({ post }: { post: PostCardRef }) {
  const data = useFragment(PostCardFragment, post);
  if (!data) return null;

  const authors = parseList(data.author);

  return (
    <li className="post-card">
      <Link to="/$slug" params={{ slug: data.id }} className="post-card-link">
        <span className="post-card-accent" aria-hidden="true" />
        {data.cardImage ? (
          <img
            className="post-card-image"
            src={data.cardImage}
            alt=""
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <h2 className="post-card-title">{data.title}</h2>
        <div className="post-card-meta">
          <span>{data.date || data.id}</span>
          <span aria-hidden="true">·</span>
          <span>{data.readingMinutes} min</span>
          <span aria-hidden="true">·</span>
          <PostAuthors authors={authors} />
        </div>
        <Pills
          tags={parseList(data.tags)}
          concern={parseList(data.concern)}
          form={data.form}
          kind={data.kind}
        />
        {data.description ? <p className="post-card-desc">{data.description}</p> : null}
      </Link>
    </li>
  );
}

function PostAuthors({ authors }: { authors: string[] }) {
  const resolved = authors.length > 0 ? authors : ["tantaman"];
  return (
    <span className="post-card-authors">
      {resolved.map((author) => (
        <span
          key={author}
          className={`post-card-author post-card-author-${author}`}
          aria-label={author === "tantaman" ? "Tantaman" : author}
          title={author}
        >
          {author === "tantaman" ? "T" : author === "claude" ? "✺" : author.slice(0, 1).toUpperCase()}
        </span>
      ))}
    </span>
  );
}
