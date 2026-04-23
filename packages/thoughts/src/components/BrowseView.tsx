import { useContext, useMemo, useState } from 'react';
import type { Cluster, ClusterItem } from '../types';
import { useClusters, useClusterItems } from '../hooks/useCache';
import { AuthContext } from '../App';

const KIND_PILLS: Record<ClusterItem['kind'], { label: string; className: string }> = {
  thought: { label: 'thought', className: 'browse-pill browse-pill--thought' },
  paste: { label: 'paste', className: 'browse-pill browse-pill--paste' },
  amplification: { label: 'amp', className: 'browse-pill browse-pill--amp' },
};

function itemHref(item: ClusterItem): string {
  if (item.kind === 'thought') return `#thought-${item.id}`;
  if (item.kind === 'paste') return `/paste/${item.id}`;
  return '#amplifications';
}

function itemTargetAttrs(item: ClusterItem): { target?: string; rel?: string } {
  if (item.kind === 'paste') return { target: '_blank', rel: 'noopener noreferrer' };
  return {};
}

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

function ItemCard({ item }: { item: ClusterItem }) {
  const pill = KIND_PILLS[item.kind];
  const { target, rel } = itemTargetAttrs(item);
  const facets = item.facets;
  return (
    <a className="browse-item-card" href={itemHref(item)} target={target} rel={rel}>
      <div className="browse-item-head">
        <span className={pill.className}>{pill.label}</span>
        {item.title && <span className="browse-item-title">{item.title}</span>}
      </div>
      {item.preview && <div className="browse-item-preview">{item.preview}</div>}
      {facets && (facets.books.length > 0 || facets.movies.length > 0 || facets.events.length > 0) && (
        <div className="browse-facets">
          {facets.books.map((b) => (
            <a
              key={`b-${b.id}`}
              className="browse-facet browse-facet--book"
              href="#books"
              onClick={(e) => e.stopPropagation()}
            >
              📚 {b.title}
            </a>
          ))}
          {facets.movies.map((m) => (
            <a
              key={`m-${m.id}`}
              className="browse-facet browse-facet--movie"
              href="#movies"
              onClick={(e) => e.stopPropagation()}
            >
              🎬 {m.title}
            </a>
          ))}
          {facets.events.map((e) => (
            <a
              key={`e-${e.id}`}
              className="browse-facet browse-facet--event"
              href="#events"
              onClick={(ev) => ev.stopPropagation()}
            >
              📅 {e.title}
            </a>
          ))}
        </div>
      )}
    </a>
  );
}
