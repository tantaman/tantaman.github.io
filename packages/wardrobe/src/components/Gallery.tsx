import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Route as IndexRoute } from '../routes/index';
import { useItems, useFacets } from '../hooks/useItems';
import { ItemCard } from './ItemCard';
import type { ItemStatus, Item } from '../types';

const STATUSES: { value: ItemStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'candidate', label: 'Candidates' },
  { value: 'shortlist', label: 'Shortlist' },
  { value: 'keep', label: 'Keep' },
  { value: 'own', label: 'Own' },
  { value: 'cut', label: 'Cut' },
];

export function Gallery() {
  const search = IndexRoute.useSearch();
  const navigate = useNavigate({ from: '/' });

  const status: ItemStatus | 'all' = search.status ?? 'all';
  const facetFilter = search.facets ?? {};
  const includeCut = search.showCut ?? false;

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!filtersOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [filtersOpen]);

  // Close drawer on Escape
  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFiltersOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtersOpen]);

  const { items, isLoading } = useItems(status, facetFilter);
  const { facets: facetDefs } = useFacets();

  const setStatus = (next: ItemStatus | 'all') => {
    navigate({
      search: (prev) => ({
        ...prev,
        status: next === 'all' ? undefined : next,
      }),
      replace: false,
    });
  };

  const toggleFacet = (key: string, value: string) => {
    navigate({
      search: (prev) => {
        const cur = { ...(prev.facets ?? {}) };
        if (cur[key] === value) delete cur[key];
        else cur[key] = value;
        return {
          ...prev,
          facets: Object.keys(cur).length > 0 ? cur : undefined,
        };
      },
      replace: false,
    });
  };

  const toggleCut = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        showCut: prev.showCut ? undefined : true,
      }),
      replace: false,
    });
  };

  const resetFilters = () => {
    navigate({ search: {}, replace: false });
  };

  const visible = useMemo(() => {
    if (status !== 'all') return items;
    if (includeCut) return items;
    return items.filter((i) => i.status !== 'cut');
  }, [items, status, includeCut]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, candidate: 0, shortlist: 0, keep: 0, own: 0, cut: 0 };
    for (const it of items) {
      c[it.status] = (c[it.status] ?? 0) + 1;
      if (it.status !== 'cut') c.all++;
    }
    return c;
  }, [items]);

  const facetCounts = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const fd of facetDefs) m[fd.key] = {};
    for (const it of items) {
      if (it.status === 'cut' && !includeCut) continue;
      for (const fd of facetDefs) {
        const v = it.facets[fd.key];
        if (v) m[fd.key][v] = (m[fd.key][v] ?? 0) + 1;
      }
    }
    return m;
  }, [items, facetDefs, includeCut]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  };

  const clearSelect = () => setSelected(new Set());

  const goCompare = () => {
    if (selected.size < 2) return;
    navigate({ to: '/compare', search: { ids: Array.from(selected).join(',') } });
  };

  const facetPicked = Object.values(facetFilter).filter(Boolean).length;
  const activeFilterCount = facetPicked + (includeCut ? 1 : 0) + (status !== 'all' ? 1 : 0);
  const hasFilters = activeFilterCount > 0;

  return (
    <div className="shell">
      <div
        className={`filter-backdrop ${filtersOpen ? 'filter-backdrop--open' : ''}`}
        onClick={() => setFiltersOpen(false)}
      />
      <aside className={`shell__aside ${filtersOpen ? 'shell__aside--open' : ''}`}>
        <div className="filter-drawer__head">
          <h2 className="filter-drawer__title">Filters</h2>
          <button className="filter-drawer__close" onClick={() => setFiltersOpen(false)}>Done</button>
        </div>
        <div className="facets">
          <div className="facets__group">
            <h2 className="facets__heading">Status</h2>
            {STATUSES.map((s) => (
              <div
                key={s.value}
                className={`facets__option ${status === s.value ? 'facets__option--active' : ''}`}
                onClick={() => setStatus(s.value)}
              >
                <span>{s.label}</span>
                <span className="facets__count">{counts[s.value as string] ?? 0}</span>
              </div>
            ))}
            {status === 'all' && (
              <div
                className={`facets__option ${includeCut ? 'facets__option--active' : ''}`}
                onClick={toggleCut}
                style={{ marginTop: 6 }}
              >
                <span>Show cut</span>
                <span className="facets__count">{counts.cut}</span>
              </div>
            )}
          </div>
          {facetDefs.map((fd) => (
            <div className="facets__group" key={fd.key}>
              <h2 className="facets__heading">{fd.label}</h2>
              {fd.options.map((opt) => {
                const active = facetFilter[fd.key] === opt.value;
                const count = facetCounts[fd.key]?.[opt.value] ?? 0;
                return (
                  <div
                    key={opt.value}
                    className={`facets__option ${active ? 'facets__option--active' : ''}`}
                    onClick={() => toggleFacet(fd.key, opt.value)}
                  >
                    <span>{opt.label}</span>
                    <span className="facets__count">{count}</span>
                  </div>
                );
              })}
            </div>
          ))}
          {hasFilters && (
            <div className="facets__reset" onClick={resetFilters}>
              Reset filters
            </div>
          )}
        </div>
      </aside>

      <main className="shell__main">
        <div className="section-head">
          <h1 className="section-head__title">
            {status === 'all' ? 'The Archive' : STATUSES.find((s) => s.value === status)?.label}
          </h1>
          <div className="section-head__meta">
            {visible.length} {visible.length === 1 ? 'specimen' : 'specimens'}
          </div>
          <div className="section-head__actions">
            <button className="filter-toggle" onClick={() => setFiltersOpen(true)}>
              Filters
              {activeFilterCount > 0 && <span className="filter-toggle__badge">{activeFilterCount}</span>}
            </button>
            <Link to="/new" className="btn btn--small">+ Acquire</Link>
          </div>
        </div>

        {isLoading && <div className="page-loading"><span className="spinner" /> Loading the archive…</div>}

        {!isLoading && visible.length === 0 && <EmptyState />}

        {visible.length > 0 && (
          <div className="gallery">
            {visible.map((item: Item) => (
              <ItemCard
                key={item.id}
                item={item}
                selected={selected.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
              />
            ))}
          </div>
        )}

        {selected.size > 0 && (
          <div className="selection-bar">
            <span className="selection-bar__count">{selected.size} selected</span>
            <button className="selection-bar__btn selection-bar__btn--primary" disabled={selected.size < 2} onClick={goCompare}>
              Compare side by side
            </button>
            <button className="selection-bar__btn" onClick={clearSelect}>Clear</button>
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty">
      <h2 className="empty__title">An empty archive</h2>
      <div className="empty__body">No specimens catalogued yet.</div>
      <Link to="/new" className="btn">Acquire the first piece</Link>
    </div>
  );
}
