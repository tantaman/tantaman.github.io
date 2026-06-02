import { useContext, useMemo, useState } from 'react';
import type { Thought, ThoughtHistoryVersion } from '../types';
import { AuthContext } from '../auth-context';
import { getThoughtHistory, revertThought } from '../api';

// Minimal LCS line diff — no dependency. Returns rows tagged same/add/del.
type DiffRow = { type: 'same' | 'add' | 'del'; line: string };
function diffLines(oldText: string, newText: string): DiffRow[] {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { out.push({ type: 'same', line: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: 'del', line: a[i] }); i++; }
    else { out.push({ type: 'add', line: b[j] }); j++; }
  }
  while (i < m) out.push({ type: 'del', line: a[i++] });
  while (j < n) out.push({ type: 'add', line: b[j++] });
  return out;
}

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const rows = useMemo(() => diffLines(oldText, newText), [oldText, newText]);
  return (
    <pre className="version-diff">
      {rows.map((r, idx) => (
        <div key={idx} className={`version-diff-line version-diff-line--${r.type}`}>
          <span className="version-diff-marker">
            {r.type === 'add' ? '+' : r.type === 'del' ? '−' : ' '}
          </span>
          {r.line || ' '}
        </div>
      ))}
    </pre>
  );
}

function fmt(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// Version timeline for an edited thought: pick a past version to diff against the
// current body, and (when authed) revert to it. Renders nothing for unedited
// thoughts (version <= 1).
export function VersionHistory({
  thought,
  onReverted,
}: {
  thought: Thought;
  onReverted?: (t: Thought) => void;
}) {
  const { secret } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<ThoughtHistoryVersion[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState(false);

  if (thought.version <= 1) return null;

  const toggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (!versions) {
      setLoading(true);
      try {
        const res = await getThoughtHistory(thought.id, secret ?? undefined);
        setVersions(res.versions);
        // Default to the version just before the current one.
        const prev = res.versions[res.versions.length - 2];
        setSelected(prev ? prev.version : null);
      } catch {
        setVersions([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const current = versions && versions.length > 0 ? versions[versions.length - 1] : null;
  const sel = versions?.find((v) => v.version === selected) ?? null;

  const handleRevert = async () => {
    if (!secret || !sel) return;
    if (!confirm(`Revert to v${sel.version}? This saves the current text to history and makes v${sel.version}'s text current.`)) return;
    setReverting(true);
    try {
      const t = await revertThought(thought.id, sel.version, secret);
      setVersions(null);
      setSelected(null);
      setOpen(false);
      onReverted?.(t);
    } catch {
      alert('Revert failed');
    } finally {
      setReverting(false);
    }
  };

  return (
    <div className="version-history">
      <button type="button" className="version-history-toggle" onClick={toggle}>
        {open ? 'Hide history' : `History · ${thought.version} versions`}
      </button>
      {open && (
        <div className="version-history-panel">
          {loading || !versions ? (
            <div className="thought-loading">Loading history…</div>
          ) : (
            <>
              <div className="version-chips">
                {versions.map((v) => (
                  <button
                    key={v.version}
                    type="button"
                    className={
                      'version-chip' +
                      (v.version === selected ? ' version-chip--active' : '') +
                      (v.version === current?.version ? ' version-chip--current' : '')
                    }
                    onClick={() => setSelected(v.version)}
                    title={fmt(v.timestamp)}
                  >
                    v{v.version}
                    {v.version === current?.version ? ' · current' : ''}
                  </button>
                ))}
              </div>
              {sel && current && sel.version !== current.version ? (
                <>
                  <div className="version-diff-caption">
                    Changes from v{sel.version} → v{current.version} (current)
                  </div>
                  <DiffView oldText={sel.body} newText={current.body} />
                  {secret && (
                    <button
                      type="button"
                      className="version-revert"
                      onClick={handleRevert}
                      disabled={reverting}
                    >
                      {reverting ? 'Reverting…' : `Revert to v${sel.version}`}
                    </button>
                  )}
                </>
              ) : (
                <div className="version-diff-caption">This is the current version.</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
