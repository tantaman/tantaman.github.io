import { useState, useEffect, useRef } from 'preact/hooks';

interface Thought {
  id: number;
  body: string;
  timestamp: number;
}

const API_BASE = '/api/thoughts';

async function fetchContextThoughts(secret: string, url: string): Promise<Thought[]> {
  const res = await fetch(`${API_BASE}/by-context?url=${encodeURIComponent(url)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) return [];
  return res.json();
}

async function createThought(secret: string, body: string, contextUrl: string): Promise<Thought | null> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body, context_url: contextUrl }),
  });
  if (!res.ok) return null;
  return res.json();
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '...' : s;
}

export function InContextButton({ secret }: { secret: string }) {
  const [open, setOpen] = useState(false);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const contextUrl = window.location.pathname;

  useEffect(() => {
    fetchContextThoughts(secret, contextUrl).then(setThoughts);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (open && popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        const fab = document.querySelector('.ict-fab');
        if (fab && fab.contains(e.target as Node)) return;
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    const thought = await createThought(secret, body.trim(), contextUrl);
    setSubmitting(false);
    if (thought) {
      setThoughts((prev) => [thought, ...prev]);
      setBody('');
      setFlash(true);
      setTimeout(() => setFlash(false), 1000);
    }
  }

  return (
    <>
      <button
        class={`ict-fab${thoughts.length > 0 ? ' ict-fab--has' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="Add thought"
        type="button"
      >
        <span class="ict-fab-icon">{open ? '\u00d7' : '+'}</span>
        {thoughts.length > 0 && !open && (
          <span class="ict-badge">{thoughts.length}</span>
        )}
      </button>

      {open && (
        <div class="ict-popover" ref={popoverRef}>
          {flash && <div class="ict-flash">Saved</div>}

          {thoughts.length > 0 && (
            <ul class="ict-list">
              {thoughts.map((t) => (
                <li key={t.id}>
                  <a href={`/thoughts/#thought-${t.id}`} class="ict-thought">
                    <span class="ict-thought-body">{truncate(t.body, 120)}</span>
                    <span class="ict-thought-date">{formatDate(t.timestamp)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <form class="ict-form" onSubmit={handleSubmit}>
            <textarea
              class="ict-textarea"
              value={body}
              onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
              placeholder="Capture a thought..."
              rows={3}
            />
            <button class="ict-submit" type="submit" disabled={submitting || !body.trim()}>
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
