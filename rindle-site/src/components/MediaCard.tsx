import type { ReactNode } from "react";

/** The cover-and-metadata card shared by the structured lanes and by any curation surface that
 *  renders an enrichment target. Extracted so a movie looks like a movie wherever it is shown, and so
 *  the card's footer stays the caller's business: a lane hangs a source-thought link there, while a
 *  curation surface deliberately hangs nothing (see the `entity` privacy model in item-kinds.ts). */

export function MediaArt({ title, image }: { title: string; image: string | null }) {
  return image
    ? <img src={image} alt="" loading="lazy" />
    : <span className="thought-media-placeholder" aria-hidden="true">{title.slice(0, 1).toUpperCase()}</span>;
}

export function MediaCard({
  title,
  image,
  meta,
  description,
  externalUrl,
  mentionCount,
  className,
  children,
}: {
  title: string;
  image: string | null;
  meta: (string | null)[];
  description?: string | null;
  externalUrl?: string | null;
  mentionCount?: number;
  className?: string;
  children?: ReactNode;
}) {
  const art = <MediaArt title={title} image={image} />;
  const shownMeta = meta.filter((value): value is string => Boolean(value));
  return (
    <article className={`thought-media-card${className ? ` ${className}` : ""}`}>
      {externalUrl
        ? <a className="thought-media-art" href={externalUrl} target="_blank" rel="noreferrer">{art}</a>
        : <div className="thought-media-art">{art}</div>}
      <div className="thought-media-info">
        <h2>{title}{mentionCount && mentionCount > 1 ? <small> ×{mentionCount}</small> : null}</h2>
        {shownMeta.length > 0 ? <p className="thought-media-meta">{shownMeta.join(" · ")}</p> : null}
        {description ? <p className="thought-lane-description">{description}</p> : null}
        {children}
      </div>
    </article>
  );
}
