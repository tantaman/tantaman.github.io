import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useRoot } from "@rindle/react";
import { pasteFilesQuery, PASTES_PAGE_SIZE, PASTES_MAX_LIMIT } from "../components/Paste.queries.ts";
import { currentQueryContext } from "../rindle-client.ts";
import { rindle } from "../rindle-tanstack.ts";
import { isPreviewableImage } from "../lib/attachments.ts";
import { formatFileSize, pasteFileUrl } from "../lib/paste-attachments.ts";
import { pasteDate } from "../lib/paste.ts";
import { canPublish } from "../../shared/auth.ts";

export const Route = createFileRoute("/paste/files")({
  loader: rindle.loader({ query: () => pasteFilesQuery({ limit: PASTES_PAGE_SIZE }, currentQueryContext()) }),
  component: PasteFiles,
});

function PasteFiles() {
  const [limit, setLimit] = useState(PASTES_PAGE_SIZE);
  const [rows, { status }] = useRoot(pasteFilesQuery, { limit }, currentQueryContext());
  const admin = canPublish(currentQueryContext().user);
  return <section className="paste-files-page">
    <header className="paste-page-heading">
      <p>{Math.min(rows.length, limit)} files</p>
      <h1>{admin ? "Files" : "Shared files"}</h1>
    </header>
    <ul className="paste-file-list">
      {rows.slice(0, limit).map((file) => {
        const ref = file.references[0];
        if (!ref) return null;
        const url = pasteFileUrl(ref.pasteId, ref.fileName);
        return <li key={file.id}>
          {isPreviewableImage(file.mediaType) ? <a href={url}><img className="paste-file-thumbnail" src={url} alt="" loading="lazy" /></a> : null}
          <div className="paste-file-info">
            <a href={url}>{ref.fileName}</a>
            <Link to="/paste/$id" params={{ id: ref.pasteId }}>{ref.document[0]?.title || "Untitled"}</Link>
            <small>{file.mediaType} · {formatFileSize(file.size)} · {pasteDate(file.createdAt)}</small>
          </div>
          <a href={pasteFileUrl(ref.pasteId, ref.fileName, true)}>download</a>
        </li>;
      })}
    </ul>
    {!rows.length ? <p className="paste-empty">{status === "complete" ? "No files yet." : "Loading files…"}</p> : null}
    {rows.length > limit && limit < PASTES_MAX_LIMIT ? <button
      type="button" className="paste-button" disabled={status !== "complete"}
      onClick={() => setLimit((value) => Math.min(value + PASTES_PAGE_SIZE, PASTES_MAX_LIMIT))}
    >{status === "complete" ? "Load more" : "Loading…"}</button> : null}
  </section>;
}
