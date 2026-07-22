import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ulid } from "ulid";

import type { PasteLanguage } from "../../shared/app-def.ts";
import { app } from "../rindle-client.ts";
import {
  extractPasteTitle,
  PASTE_LANGUAGE_OPTIONS,
  pasteExcerpt,
} from "../lib/paste.ts";
import type { PasteListRow } from "./Paste.queries.ts";
import { PasteList } from "./PasteList.tsx";

interface ForkSource {
  id: string;
  title: string | null;
  body: string;
  language: string;
}

function knownLanguage(value: string): PasteLanguage {
  return PASTE_LANGUAGE_OPTIONS.some((option) => option.value === value)
    ? (value as PasteLanguage)
    : "markdown";
}

export function PasteEditor({
  recent,
  source,
}: {
  recent: readonly PasteListRow[];
  source?: ForkSource;
}) {
  const navigate = useNavigate();
  const [body, setBody] = useState(source?.body ?? "");
  const [language, setLanguage] = useState<PasteLanguage>(knownLanguage(source?.language ?? "markdown"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || saving) return;
    setSaving(true);
    setError(null);
    const id = ulid();
    try {
      app.mutate.createPaste({
        paste: {
          id,
          body,
          excerpt: pasteExcerpt(body),
          language,
          title: extractPasteTitle(body, language),
          createdAt: Date.now(),
          parentId: source?.id ?? null,
        },
      });
      await navigate({ to: "/paste/$id", params: { id } });
    } catch (cause) {
      setSaving(false);
      setError(cause instanceof Error ? cause.message : "Could not save the paste.");
    }
  }

  function submitFromKeyboard(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <section className="paste-editor-page">
      {source ? (
        <p className="paste-fork-note">
          Forking <Link to="/paste/$id" params={{ id: source.id }}>{source.title || "Untitled"}</Link>
        </p>
      ) : null}

      <form className="paste-editor" onSubmit={(event) => void save(event)}>
        <div className="paste-editor-toolbar">
          <label htmlFor="paste-language">Language</label>
          <select
            id="paste-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as PasteLanguage)}
          >
            {PASTE_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {source ? (
            <button className="paste-button paste-button--quiet" type="button" onClick={() => setBody("")}>
              Clear
            </button>
          ) : null}
        </div>
        <textarea
          value={body}
          required
          autoFocus
          spellCheck={language === "markdown" || language === "plaintext"}
          placeholder="Write something…"
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={submitFromKeyboard}
        />
        <div className="paste-editor-actions">
          <button className="paste-button paste-button--primary" type="submit" disabled={saving || !body.trim()}>
            {saving ? "Saving…" : "Save"}
          </button>
          <span>Cmd/Ctrl + Enter</span>
        </div>
        {error ? <p className="paste-error" role="alert">{error}</p> : null}
      </form>

      <section className="paste-recents" aria-labelledby="paste-recents-heading">
        <div className="paste-section-heading">
          <h2 id="paste-recents-heading">Recent</h2>
          <Link to="/paste/all">all</Link>
        </div>
        <PasteList rows={recent} empty="No pastes yet." showShared />
      </section>
    </section>
  );
}
