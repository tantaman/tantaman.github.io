import { useMemo, useState } from "react";
import { ulid } from "ulid";

import { formatThoughtTime, hashThoughtBody, thoughtTagArgs } from "../lib/thoughts.ts";
import { app } from "../rindle-client.ts";
import type { EditableThought } from "./ThoughtComposer.tsx";

interface ThoughtHistoryRow {
  id: string;
  version: number;
  body: string;
  writtenAt: number;
  replacedAt: number;
}

interface ThoughtHistoryProps {
  thought: EditableThought;
  updatedAt: number;
  history: readonly ThoughtHistoryRow[];
  isAdmin: boolean;
}

export function ThoughtHistory({ thought, updatedAt, history, isAdmin }: ThoughtHistoryProps) {
  const versions = useMemo(
    () => [
      ...history.map((entry) => ({
        version: entry.version,
        body: entry.body,
        writtenAt: entry.writtenAt,
        current: false,
      })),
      {
        version: thought.version,
        body: thought.body,
        writtenAt: updatedAt,
        current: true,
      },
    ].sort((a, b) => a.version - b.version),
    [history, thought.body, thought.version, updatedAt],
  );
  const [open, setOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [reverting, setReverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = versions.find((entry) => entry.version === (selectedVersion ?? thought.version - 1))
    ?? versions.at(-1);

  if (thought.version <= 1 || history.length === 0) return null;

  async function revert() {
    if (!selected || selected.current || reverting) return;
    const confirmed = window.confirm(
      `Restore version ${selected.version}? The current text will remain in history as version ${thought.version}.`,
    );
    if (!confirmed) return;

    setReverting(true);
    setError(null);
    try {
      const bodyHash = await hashThoughtBody(selected.body);
      app.mutate.editThought({
        id: thought.id,
        expectedVersion: thought.version,
        historyId: ulid(),
        body: selected.body,
        bodyHash,
        updatedAt: Date.now(),
        contentRevision: ulid(),
        private: thought.private,
        tags: thoughtTagArgs(selected.body),
        attachments: [],
      });
      setSelectedVersion(null);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not restore that version.");
    } finally {
      setReverting(false);
    }
  }

  return (
    <section className="thought-history" aria-label="Thought history">
      <button
        className="thought-history-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>History</span>
        <span>{thought.version} versions</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>

      {open ? (
        <div className="thought-history-panel">
          <div className="thought-history-versions" aria-label="Choose a version">
            {versions.map((entry) => (
              <button
                key={entry.version}
                type="button"
                className={entry.version === selected?.version ? "is-selected" : undefined}
                onClick={() => setSelectedVersion(entry.version)}
              >
                v{entry.version}{entry.current ? " · current" : ""}
              </button>
            ))}
          </div>

          {selected ? (
            <>
              <div className="thought-history-caption">
                <span>Version {selected.version}</span>
                <time>{formatThoughtTime(selected.writtenAt)}</time>
              </div>
              <div className={`thought-history-compare${selected.current ? " is-current" : ""}`}>
                <div>
                  <span>v{selected.version}</span>
                  <pre>{selected.body}</pre>
                </div>
                {!selected.current ? (
                  <div>
                    <span>v{thought.version} · current</span>
                    <pre>{thought.body}</pre>
                  </div>
                ) : null}
              </div>
              {isAdmin && !selected.current ? (
                <button className="thought-button thought-button--history" type="button" onClick={revert} disabled={reverting}>
                  {reverting ? "Restoring…" : `Restore v${selected.version} as a new revision`}
                </button>
              ) : null}
            </>
          ) : null}
          {error ? <p className="thought-action-error" role="alert">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
