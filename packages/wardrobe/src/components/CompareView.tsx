import { Fragment, useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import useSWR from 'swr';
import * as api from '../api';
import { getSecret } from '../auth';
import { useFacets } from '../hooks/useItems';
import { attachmentUrl } from '../api';
import type { Item, ItemStatus } from '../types';

function formatPrice(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  const d = cents / 100;
  return `$${d.toFixed(d % 1 === 0 ? 0 : 2)}`;
}

function catalogNumber(id: number): string {
  return `№ ${id.toString().padStart(3, '0')}`;
}

export function CompareView({ idsParam }: { idsParam: string }) {
  const navigate = useNavigate();
  const ids = useMemo(() => idsParam.split(',').map(Number).filter((n) => Number.isFinite(n)), [idsParam]);
  const secret = getSecret();
  const { data, error, isLoading, mutate } = useSWR(
    ['compare', idsParam, secret ? '1' : '0'],
    async () => Promise.all(ids.map((id) => api.getItem(id, secret))),
  );
  const { facets: facetDefs } = useFacets();

  if (isLoading) return <div className="page-loading"><span className="spinner" /> Composing the spread…</div>;
  if (error || !data) return <div className="page-loading">Couldn't load the comparison.</div>;
  if (data.length === 0) return <div className="page-loading">No items to compare.</div>;

  const setStatus = async (item: Item, status: ItemStatus) => {
    if (!secret) return;
    await api.patchItem(item.id, { status }, secret);
    await mutate();
  };

  const n = data.length;

  return (
    <div className="compare">
      <div className="compare__head">
        <h1 className="compare__title">{n}-up comparison</h1>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
          Specimens {data.map((i) => catalogNumber(i.id)).join(' · ')}
        </div>
        <Link to="/" className="btn btn--ghost btn--small">← Back to archive</Link>
      </div>

      <div className="compare__spread" style={{ ['--n' as string]: n }}>
        {data.map((item) => {
          const hero = item.photos[0] ?? null;
          const price = formatPrice(item.price_cents);
          return (
            <div key={item.id} className="compare__panel">
              <Link to="/item/$id" params={{ id: item.id }} className="compare__panel-frame">
                {hero ? (
                  <img src={attachmentUrl(hero.key)} alt={item.name ?? 'item'} />
                ) : item.links[0]?.image ? (
                  <img src={item.links[0].image} alt="" />
                ) : (
                  <div className="card__empty">untitled</div>
                )}
              </Link>
              <div className="compare__panel-meta">
                <h2 className="compare__panel-name">{item.name || item.brand || 'Untitled'}</h2>
                {price && <div className="compare__panel-price">{price}</div>}
                <div className="compare__panel-brand">{item.brand || catalogNumber(item.id)}</div>
              </div>

              <div className="compare__panel-facets">
                {facetDefs.map((fd) => (
                  <Fragment key={fd.key}>
                    <div className="compare__panel-facets-key">{fd.label}</div>
                    <div>{item.facets[fd.key] || '—'}</div>
                  </Fragment>
                ))}
              </div>

              <div className="compare__panel-actions">
                <button
                  className={`status-btn status-btn--keep ${item.status === 'keep' ? 'status-btn--active' : ''}`}
                  onClick={() => setStatus(item, 'keep')}
                >Keep</button>
                <button
                  className={`status-btn ${item.status === 'shortlist' ? 'status-btn--active' : ''}`}
                  onClick={() => setStatus(item, 'shortlist')}
                >Shortlist</button>
                <button
                  className={`status-btn status-btn--cut ${item.status === 'cut' ? 'status-btn--active' : ''}`}
                  onClick={() => setStatus(item, 'cut')}
                >Cut</button>
                <button
                  className="status-btn"
                  onClick={() => navigate({ to: '/item/$id', params: { id: item.id } })}
                >Detail →</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
