import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useItems, useFacets } from '../hooks/useItems';
import * as api from '../api';
import { getSecret } from '../auth';
import { attachmentUrl } from '../api';
import type { Item } from '../types';

function catalogNumber(id: number): string {
  return `№ ${id.toString().padStart(3, '0')}`;
}

function formatPrice(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  const d = cents / 100;
  return `$${d.toFixed(d % 1 === 0 ? 0 : 2)}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface PoolFilter {
  category?: string;
}

export function BracketView() {
  const { facets: facetDefs } = useFacets();
  const categoryDef = facetDefs.find((f) => f.key === 'category');
  const [filter, setFilter] = useState<PoolFilter>({});
  const [started, setStarted] = useState(false);

  const facetParam = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    if (filter.category) out.category = filter.category;
    return out;
  }, [filter.category]);

  // Pool is candidates + shortlist (still under consideration)
  const { items, isLoading, mutate } = useItems('all', facetParam);

  const pool: Item[] = useMemo(() => {
    return items.filter((i) => i.status === 'candidate' || i.status === 'shortlist');
  }, [items]);

  const [pair, setPair] = useState<[Item, Item] | null>(null);
  const [round, setRound] = useState(0);
  const [decisions, setDecisions] = useState(0);

  // Initialize / restock the pair from remaining pool
  useEffect(() => {
    if (!started) return;
    if (pair) {
      // If the current pair's items are still in pool, keep them
      const stillThere = pool.find((p) => p.id === pair[0].id) && pool.find((p) => p.id === pair[1].id);
      if (stillThere) return;
    }
    if (pool.length < 2) {
      setPair(null);
      return;
    }
    const shuffled = shuffle(pool);
    setPair([shuffled[0], shuffled[1]]);
    setRound((r) => r + 1);
  }, [started, pool, pair]);

  const cancel = () => {
    setStarted(false);
    setPair(null);
    setDecisions(0);
  };

  const choose = async (winner: Item, loser: Item) => {
    const secret = getSecret();
    if (!secret) return;
    // Winner → shortlist (if not already higher); loser → cut
    await Promise.all([
      winner.status === 'candidate'
        ? api.patchItem(winner.id, { status: 'shortlist' }, secret)
        : Promise.resolve(),
      api.patchItem(loser.id, { status: 'cut' }, secret),
    ]);
    setDecisions((d) => d + 1);
    setPair(null);
    await mutate();
  };

  if (!started) {
    return (
      <div className="bracket">
        <div className="section-head" style={{ marginBottom: 32 }}>
          <h1 className="section-head__title">Eliminations</h1>
          <div className="section-head__meta">Pairwise selection</div>
          <Link to="/" className="btn btn--ghost btn--small">← Archive</Link>
        </div>

        <div style={{ maxWidth: 540, margin: '40px auto 0', fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink-soft)', textAlign: 'center', lineHeight: 1.5 }}>
          <p style={{ fontStyle: 'italic', fontSize: 22, marginBottom: 24 }}>
            Two specimens. One stays, one is set aside.
          </p>
          <p style={{ fontSize: 14, color: 'var(--ink-faint)', marginBottom: 32 }}>
            Choose a category to narrow the pool, or compare everything still under consideration.
          </p>
        </div>

        {categoryDef && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 36 }}>
            <button
              className={`status-btn ${!filter.category ? 'status-btn--active' : ''}`}
              onClick={() => setFilter({})}
            >
              All categories
            </button>
            {categoryDef.options.map((o) => (
              <button
                key={o.value}
                className={`status-btn ${filter.category === o.value ? 'status-btn--active' : ''}`}
                onClick={() => setFilter({ category: o.value })}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 24 }}>
          {isLoading ? 'Counting the pool…' : `${pool.length} specimens remain`}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button className="btn" disabled={pool.length < 2} onClick={() => setStarted(true)}>
            Begin eliminations
          </button>
        </div>
      </div>
    );
  }

  if (!pair) {
    return (
      <div className="bracket">
        <div className="bracket__done">
          <p style={{ margin: 0 }}>The pool is exhausted.</p>
          <div className="bracket__done-meta">
            {decisions} decisions made · {pool.length} {pool.length === 1 ? 'specimen' : 'specimens'} remain
          </div>
          <div style={{ marginTop: 36, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn" onClick={() => { setStarted(false); setDecisions(0); }}>
              New round
            </button>
            <Link to="/wardrobe" className="btn btn--ghost">The set →</Link>
          </div>
        </div>
      </div>
    );
  }

  const [a, b] = pair;
  const heroA = a.photos[0] ?? null;
  const heroB = b.photos[0] ?? null;

  return (
    <div className="bracket">
      <div className="bracket__progress">
        <span>Round {round} · Decision {decisions + 1}</span>
        <div className="bracket__bar">
          <div className="bracket__bar-fill" style={{ width: `${Math.min(100, (decisions / Math.max(1, decisions + Math.max(0, pool.length - 1))) * 100)}%` }} />
        </div>
        <span>{pool.length} in pool</span>
      </div>

      <div className="bracket__pair">
        <div className="bracket__side" onClick={() => choose(a, b)}>
          <div className="bracket__side-frame">
            {heroA ? (
              <img src={attachmentUrl(heroA.key)} alt="" />
            ) : a.links[0]?.image ? (
              <img src={a.links[0].image} alt="" />
            ) : (
              <div className="card__empty">untitled</div>
            )}
          </div>
          <div className="bracket__side-label">
            <h3 className="bracket__side-name">{a.name || 'Untitled'}</h3>
            <div className="bracket__side-brand">
              {a.brand ? `${a.brand} · ` : ''}{catalogNumber(a.id)}
              {formatPrice(a.price_cents) ? ` · ${formatPrice(a.price_cents)}` : ''}
            </div>
          </div>
        </div>

        <div className="bracket__vs">vs</div>

        <div className="bracket__side" onClick={() => choose(b, a)}>
          <div className="bracket__side-frame">
            {heroB ? (
              <img src={attachmentUrl(heroB.key)} alt="" />
            ) : b.links[0]?.image ? (
              <img src={b.links[0].image} alt="" />
            ) : (
              <div className="card__empty">untitled</div>
            )}
          </div>
          <div className="bracket__side-label">
            <h3 className="bracket__side-name">{b.name || 'Untitled'}</h3>
            <div className="bracket__side-brand">
              {b.brand ? `${b.brand} · ` : ''}{catalogNumber(b.id)}
              {formatPrice(b.price_cents) ? ` · ${formatPrice(b.price_cents)}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 40, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="btn btn--ghost btn--small" onClick={() => setPair(null)}>Skip pair</button>
        <button className="btn btn--ghost btn--small" onClick={cancel}>End round</button>
      </div>
    </div>
  );
}
