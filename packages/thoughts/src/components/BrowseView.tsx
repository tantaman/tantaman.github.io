import { useContext, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Cluster, ClusterItem } from '../types';
import { useClusters, useClusterItems } from '../hooks/useCache';
import { AuthContext } from '../App';

const KIND_PILLS: Record<ClusterItem['kind'], { label: string; className: string }> = {
  thought: { label: 'thought', className: 'browse-pill browse-pill--thought' },
  paste: { label: 'paste', className: 'browse-pill browse-pill--paste' },
  amplification: { label: 'amp', className: 'browse-pill browse-pill--amp' },
};

export function BrowseView() {
  const { secret } = useContext(AuthContext);
  const { data: clustersData } = useClusters(secret);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const sortedClusters: Cluster[] = useMemo(
    () => (clustersData?.clusters ?? []).slice().sort((a, b) => b.size - a.size),
    [clustersData],
  );

  const selectedIds = useMemo(() => [...selected].sort(), [selected]);
  const { data: itemsData, isLoading: itemsLoading } = useClusterItems(selectedIds, secret);

  function toggleCluster(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const items = itemsData?.items ?? [];

  return (
    <div className="browse-view">
      <aside className="browse-cluster-panel">
        <h2 className="browse-panel-title">Clusters</h2>
        {!clustersData ? (
          <div className="thought-loading">Loading…</div>
        ) : sortedClusters.length === 0 ? (
          <div className="thought-loading">
            No clusters yet. Run <code>pnpm clusters</code> after deploying.
          </div>
        ) : (
          <ul className="browse-cluster-list">
            {sortedClusters.map((c) => (
              <li key={c.id}>
                <label className={`browse-cluster-item${selected.has(c.id) ? ' selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleCluster(c.id)}
                  />
                  <span className="browse-cluster-label">{c.label}</span>
                  <span className="browse-cluster-size">{c.size}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {selected.size > 0 && (
          <button className="browse-clear" onClick={() => setSelected(new Set())}>
            Clear ({selected.size})
          </button>
        )}
      </aside>

      <section className="browse-items-panel">
        {selected.size === 0 ? (
          <div className="thought-loading">Select one or more clusters to browse.</div>
        ) : itemsLoading && !itemsData ? (
          <div className="thought-loading">Loading items…</div>
        ) : items.length === 0 ? (
          <div className="thought-loading">
            No items appear in <strong>all</strong> selected clusters. Unselect some to widen.
          </div>
        ) : (
          <>
            <div className="browse-items-meta">
              {items.length} item{items.length === 1 ? '' : 's'}
              {selected.size > 1 ? ` in all ${selected.size} clusters` : ''}
            </div>
            <div className="browse-items-list">
              {items.map((it) => (
                <ItemCard key={`${it.kind}-${it.id}`} item={it} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ItemCardInner({ item }: { item: ClusterItem }) {
  const pill = KIND_PILLS[item.kind];
  const facets = item.facets;
  return (
    <>
      <div className="browse-item-head">
        <span className={pill.className}>{pill.label}</span>
        {item.title && <span className="browse-item-title">{item.title}</span>}
      </div>
      {item.preview && <div className="browse-item-preview">{item.preview}</div>}
      {facets && (facets.books.length > 0 || facets.movies.length > 0 || facets.events.length > 0) && (
        <div className="browse-facets">
          {facets.books.map((b) => (
            <Link key={`b-${b.id}`} to="/books" className="browse-facet browse-facet--book" onClick={(e) => e.stopPropagation()}>
              📚 {b.title}
            </Link>
          ))}
          {facets.movies.map((m) => (
            <Link key={`m-${m.id}`} to="/movies" className="browse-facet browse-facet--movie" onClick={(e) => e.stopPropagation()}>
              🎬 {m.title}
            </Link>
          ))}
          {facets.events.map((e) => (
            <Link key={`e-${e.id}`} to="/events" className="browse-facet browse-facet--event" onClick={(ev) => ev.stopPropagation()}>
              📅 {e.title}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function ItemCard({ item }: { item: ClusterItem }) {
  if (item.kind === 'paste') {
    return (
      <a className="browse-item-card" href={`/paste/${item.id}`} target="_blank" rel="noopener noreferrer">
        <ItemCardInner item={item} />
      </a>
    );
  }
  if (item.kind === 'thought') {
    return (
      <Link className="browse-item-card" to="/t/$id" params={{ id: String(item.id) }}>
        <ItemCardInner item={item} />
      </Link>
    );
  }
  return (
    <Link className="browse-item-card" to="/amplifications">
      <ItemCardInner item={item} />
    </Link>
  );
}
