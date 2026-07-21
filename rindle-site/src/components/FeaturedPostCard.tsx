// One of the three poster-like cards at the top of the index. It uses the same narrow fragment as
// regular cards, so switching a post into or out of the featured window never pulls article HTML.

import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { useFragment } from "@rindle/react";

import { PostCardFragment } from "./PostCard.queries.ts";
import type { PostCardRef } from "./PostCard.queries.ts";

export function FeaturedPostCard({ post, priority = false }: { post: PostCardRef; priority?: boolean }) {
  const data = useFragment(PostCardFragment, post);
  if (!data) return null;

  const semanticColor = data.color && /^#[0-9a-f]{6}$/i.test(data.color) ? data.color : undefined;
  const style = semanticColor ? ({ "--featured-color": semanticColor } as CSSProperties) : undefined;

  return (
    <li className="featured-post-card">
      <Link
        to="/$slug"
        params={{ slug: data.id }}
        className={`featured-post-link${data.cardImage ? "" : " featured-post-link-no-image"}`}
        style={style}
      >
        {data.cardImage ? (
          <img
            className="featured-post-image"
            src={data.cardImage}
            alt=""
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <span className="featured-post-overlay">
          <span className="featured-post-thesis">{data.thesis || data.description || data.title}</span>
          <span className="featured-post-title">{data.title} →</span>
        </span>
      </Link>
    </li>
  );
}
