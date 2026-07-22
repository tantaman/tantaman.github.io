import { Link } from "@tanstack/react-router";

import type { PasteListRow } from "./Paste.queries.ts";
import { pasteDate } from "../lib/paste.ts";

export function PasteList({
  rows,
  empty,
  showExcerpt = false,
  showShared = false,
}: {
  rows: readonly PasteListRow[];
  empty: string;
  showExcerpt?: boolean;
  showShared?: boolean;
}) {
  if (rows.length === 0) return <p className="paste-empty">{empty}</p>;

  return (
    <ul className={`paste-list${showExcerpt ? " paste-list--expanded" : ""}`}>
      {rows.map((paste) => (
        <li key={paste.id}>
          <div className="paste-list-main">
            <div className="paste-list-line">
              <Link to="/paste/$id" params={{ id: paste.id }}>
                {paste.title || "Untitled"}
              </Link>
              {paste.parentId ? <span title="Forked from another paste">↑</span> : null}
              {showShared && paste.shared === 1 ? <span title="Shared">●</span> : null}
            </div>
            {showExcerpt && paste.excerpt ? <p>{paste.excerpt}</p> : null}
          </div>
          <time dateTime={new Date(paste.createdAt).toISOString()}>
            {pasteDate(showShared ? paste.createdAt : (paste.sharedAt ?? paste.createdAt))}
          </time>
        </li>
      ))}
    </ul>
  );
}
