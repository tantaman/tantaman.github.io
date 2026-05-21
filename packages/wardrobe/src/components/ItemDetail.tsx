import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useItem, useFacets } from '../hooks/useItems';
import * as api from '../api';
import { attachmentUrl } from '../api';
import { getSecret } from '../auth';
import type { ItemStatus, Item } from '../types';

const STATUS_BUTTONS: { value: ItemStatus; label: string; cls?: string }[] = [
  { value: 'candidate', label: 'Candidate' },
  { value: 'shortlist', label: 'Shortlist' },
  { value: 'keep', label: 'Keep', cls: 'status-btn--keep' },
  { value: 'own', label: 'Own', cls: 'status-btn--keep' },
  { value: 'cut', label: 'Cut', cls: 'status-btn--cut' },
];

function formatPrice(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  const dollars = cents / 100;
  return `$${dollars.toFixed(dollars % 1 === 0 ? 0 : 2)}`;
}

function catalogNumber(id: number): string {
  return `Cat. ${id.toString().padStart(4, '0')}`;
}

interface Props { id: number }

export function ItemDetail({ id }: Props) {
  const navigate = useNavigate();
  const { item, isLoading, mutate } = useItem(id);
  const { facets: facetDefs } = useFacets();
  const [activePhoto, setActivePhoto] = useState(0);
  const [editingNotes, setEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [editingBrand, setEditingBrand] = useState(false);
  const [draftBrand, setDraftBrand] = useState('');
  const [editingPrice, setEditingPrice] = useState(false);
  const [draftPrice, setDraftPrice] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [fetchingLink, setFetchingLink] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setDraftNotes(item.notes || '');
      setDraftName(item.name || '');
      setDraftBrand(item.brand || '');
      setDraftPrice(item.price_cents != null ? (item.price_cents / 100).toString() : '');
    }
  }, [item?.id]);

  if (isLoading) return <div className="page-loading"><span className="spinner" /> Loading…</div>;
  if (!item) return <div className="page-loading">Specimen not found. <Link to="/">Return to archive</Link></div>;

  const update = async (patch: Parameters<typeof api.patchItem>[1]) => {
    const secret = getSecret();
    if (!secret) return;
    const updated = await api.patchItem(item.id, patch, secret);
    await mutate(updated, { revalidate: false });
  };

  const setStatus = (s: ItemStatus) => update({ status: s });
  const setRating = (r: number) => update({ rating: item.rating === r ? null : r });
  const setFacet = (key: string, value: string) => {
    update({ facets: { ...item.facets, [key]: value } });
  };

  const handleNotesSave = async () => {
    await update({ notes: draftNotes });
    setEditingNotes(false);
  };

  const handleNameSave = async () => {
    await update({ name: draftName.trim() || null });
    setEditingName(false);
  };

  const handleBrandSave = async () => {
    await update({ brand: draftBrand.trim() || null });
    setEditingBrand(false);
  };

  const handlePriceSave = async () => {
    const cents = draftPrice ? Math.round(parseFloat(draftPrice) * 100) : null;
    await update({ price_cents: cents });
    setEditingPrice(false);
  };

  const onAddPhotos = async (files: File[]) => {
    const secret = getSecret();
    if (!secret) return;
    const updated = await api.addPhotos(item.id, files, secret);
    await mutate(updated, { revalidate: false });
    setActivePhoto(updated.photos.length - files.length);
  };

  const removePhoto = async (key: string) => {
    const secret = getSecret();
    if (!secret) return;
    const updated = await api.removePhoto(item.id, key, secret);
    await mutate(updated, { revalidate: false });
    setActivePhoto(0);
  };

  const addLink = async () => {
    const url = linkUrl.trim();
    if (!url || !item) return;
    setLinkUrl('');
    setFetchingLink(true);
    try {
      let next = [...item.links, { url }];
      // Save the optimistic link first so it persists if OG fails.
      await update({ links: next });
      const og = await api.fetchOg(url);
      if (og) {
        next = next.map((l) =>
          l.url === url
            ? {
                url,
                title: og.title ?? og.site_name ?? undefined,
                image: og.image ?? undefined,
                price_cents: og.price_cents ?? undefined,
              }
            : l,
        );
        const patch: Parameters<typeof api.patchItem>[1] = { links: next };
        if (og.site_name && !item.brand) patch.brand = og.site_name;
        if (og.price_cents != null && item.price_cents == null) patch.price_cents = og.price_cents;
        await update(patch);
      }
    } finally {
      setFetchingLink(false);
    }
  };

  const removeLink = async (idx: number) => {
    if (!item) return;
    const next = item.links.filter((_, i) => i !== idx);
    await update({ links: next });
  };

  const runSuggest = async () => {
    if (!item) return;
    const secret = getSecret();
    if (!secret) { setSuggestError('Set the auth secret first.'); return; }
    if (item.photos.length === 0) { setSuggestError('Add a photo first.'); return; }
    setSuggestError(null);
    setSuggesting(true);
    try {
      const res = await api.suggestFacets(item.id, secret);
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.suggestions)) {
        // Only surface suggestions that differ from existing values
        if (item.facets[k] !== v) next[k] = v;
      }
      setSuggestions(next);
      if (Object.keys(next).length === 0) setSuggestError('No new suggestions — values already set or unclear.');
    } catch (e) {
      setSuggestError((e as Error).message);
    } finally {
      setSuggesting(false);
    }
  };

  const applySuggestion = async (key: string) => {
    if (!item) return;
    const value = suggestions[key];
    if (!value) return;
    await update({ facets: { ...item.facets, [key]: value } });
    setSuggestions((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const applyAllSuggestions = async () => {
    if (!item || Object.keys(suggestions).length === 0) return;
    await update({ facets: { ...item.facets, ...suggestions } });
    setSuggestions({});
  };

  const remove = async () => {
    if (!confirm('Permanently delete this item? Use "Cut" instead to keep it in the archive.')) return;
    const secret = getSecret();
    if (!secret) return;
    await api.deleteItem(item.id, secret);
    navigate({ to: '/' });
  };

  const hero = item.photos[activePhoto] ?? item.photos[0];
  const price = formatPrice(item.price_cents);

  return (
    <div className="detail">
      <div className="detail__gallery">
        <div className="detail__hero">
          {hero ? (
            <img src={attachmentUrl(hero.key)} alt={item.name ?? 'item'} />
          ) : item.links[0]?.image ? (
            <img src={item.links[0].image} alt={item.name ?? 'item'} />
          ) : (
            <div className="card__empty" style={{ fontSize: 48 }}>untitled</div>
          )}
        </div>
        <div className="detail__thumbs">
          {item.photos.map((p, idx) => (
            <div
              key={p.key}
              className={`detail__thumb ${idx === activePhoto ? 'detail__thumb--active' : ''}`}
              onClick={() => setActivePhoto(idx)}
            >
              <img src={attachmentUrl(p.key)} alt="" />
              <span className="detail__thumb-remove" onClick={(e) => { e.stopPropagation(); removePhoto(p.key); }}>×</span>
            </div>
          ))}
          <div
            className="detail__thumb"
            onClick={() => fileInput.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--ink-faint)',
              cursor: 'pointer',
              borderStyle: 'dashed',
            }}
          >
            + add
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInput}
            style={{ display: 'none' }}
            onChange={(e) => {
              const fs = Array.from(e.target.files ?? []);
              if (fs.length > 0) onAddPhotos(fs);
            }}
          />
        </div>
      </div>

      <div className="detail__body">
        <div>
          <div className="detail__catnum">{catalogNumber(item.id)} · {item.status.toUpperCase()}</div>
          {editingName ? (
            <div className="field-text">
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false); }}
              />
            </div>
          ) : (
            <h1 className="detail__name" onClick={() => setEditingName(true)} style={{ cursor: 'pointer' }}>
              {item.name || <em style={{ opacity: 0.5 }}>Untitled</em>}
            </h1>
          )}
          {editingBrand ? (
            <div className="field-text" style={{ marginTop: 8 }}>
              <input
                autoFocus
                value={draftBrand}
                onChange={(e) => setDraftBrand(e.target.value)}
                onBlur={handleBrandSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleBrandSave(); if (e.key === 'Escape') setEditingBrand(false); }}
              />
            </div>
          ) : (
            <div className="detail__brand" onClick={() => setEditingBrand(true)} style={{ cursor: 'pointer' }}>
              {item.brand || <em style={{ opacity: 0.5, textTransform: 'none' }}>+ brand</em>}
            </div>
          )}
        </div>

        <div className="detail__status-row">
          {STATUS_BUTTONS.map((sb) => (
            <button
              key={sb.value}
              className={`status-btn ${sb.cls ?? ''} ${item.status === sb.value ? 'status-btn--active' : ''}`}
              onClick={() => setStatus(sb.value)}
            >
              {sb.label}
            </button>
          ))}
        </div>

        <div className="detail__rating">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
            Rating
          </div>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={`rating-star ${(item.rating ?? 0) >= n ? 'rating-star--filled' : ''}`}
                onClick={() => setRating(n)}
              >
                ★
              </div>
            ))}
          </div>
          {editingPrice ? (
            <div className="field-text" style={{ marginLeft: 'auto', width: 100 }}>
              <input
                autoFocus
                value={draftPrice}
                onChange={(e) => setDraftPrice(e.target.value)}
                onBlur={handlePriceSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePriceSave(); if (e.key === 'Escape') setEditingPrice(false); }}
                inputMode="decimal"
                placeholder="0.00"
              />
            </div>
          ) : (
            <div
              style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 13, fontVariantNumeric: 'tabular-nums', cursor: 'pointer' }}
              onClick={() => setEditingPrice(true)}
            >
              {price || <span style={{ color: 'var(--ink-faint)' }}>+ price</span>}
            </div>
          )}
        </div>

        <hr className="detail__rule" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
            Facets
          </div>
          <button
            className="btn btn--small btn--ghost"
            onClick={runSuggest}
            disabled={suggesting || item.photos.length === 0}
            title={item.photos.length === 0 ? 'Add a photo to enable suggestions' : 'Suggest from photo'}
          >
            {suggesting ? 'Reading photo…' : '✦ Suggest'}
          </button>
        </div>
        {suggestError && (
          <div style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
            {suggestError}
          </div>
        )}
        {Object.keys(suggestions).length > 0 && (
          <div style={{ padding: '12px 14px', border: '1px dashed var(--sage)', background: 'color-mix(in srgb, var(--sage) 6%, var(--paper))', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
                Suggestions
              </div>
              <button className="btn btn--small" onClick={applyAllSuggestions}>Accept all</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(suggestions).map(([k, v]) => {
                const fd = facetDefs.find((f) => f.key === k);
                const valueLabel = fd?.options.find((o) => o.value === v)?.label ?? v;
                return (
                  <button
                    key={k}
                    onClick={() => applySuggestion(k)}
                    className="status-btn"
                    style={{ borderColor: 'var(--sage)', color: 'var(--sage)' }}
                  >
                    {fd?.label ?? k} → {valueLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="detail__facets">
          {facetDefs.map((fd) => {
            const current = item.facets[fd.key] || '';
            const suggested = suggestions[fd.key];
            return (
              <Fragment key={fd.key}>
                <div className="detail__facet-key">{fd.label}</div>
                <select
                  className="detail__facet-val"
                  value={current}
                  onChange={(e) => setFacet(fd.key, e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 0,
                    cursor: 'pointer',
                    appearance: 'none',
                    color: suggested ? 'var(--sage)' : undefined,
                  }}
                >
                  <option value="">—</option>
                  {fd.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Fragment>
            );
          })}
        </div>

        <hr className="detail__rule" />
        <div className="detail__links">
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 4 }}>
            Sources
          </div>
          {item.links.map((l, idx) => (
            <div key={idx} className="link-row">
              <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0, color: 'inherit' }}>
                {l.image && <div className="link-row__thumb" style={{ backgroundImage: `url(${l.image})` }} />}
                <div className="link-row__body">
                  <div className="link-row__title">{l.title || 'Source'}</div>
                  <div className="link-row__url">{l.url}</div>
                </div>
              </a>
              {l.price_cents != null && <div className="link-row__price">{formatPrice(l.price_cents)}</div>}
              <button className="link-row__remove" onClick={() => removeLink(idx)} title="Remove link">×</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: item.links.length > 0 ? 8 : 0 }}>
            <input
              style={{
                flex: 1,
                background: 'transparent',
                border: '1px solid var(--hairline)',
                padding: '8px 10px',
                fontFamily: 'var(--sans)',
                fontSize: 13,
                color: 'var(--ink)',
              }}
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://…"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
            />
            <button className="btn btn--small btn--ghost" onClick={addLink} disabled={fetchingLink}>
              {fetchingLink ? 'Fetching…' : 'Add link'}
            </button>
          </div>
        </div>

        <hr className="detail__rule" />

        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>
            Notes
          </div>
          {editingNotes ? (
            <div className="field-text">
              <textarea
                autoFocus
                rows={5}
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                onBlur={handleNotesSave}
              />
            </div>
          ) : (
            <div
              className="detail__notes"
              onClick={() => setEditingNotes(true)}
              style={{ cursor: 'pointer', minHeight: 36 }}
            >
              {item.notes || <em style={{ color: 'var(--ink-faint)' }}>Add a note…</em>}
            </div>
          )}
        </div>

        <hr className="detail__rule" />

        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" className="btn btn--ghost btn--small">← The Archive</Link>
          <button className="btn btn--small" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={remove}>
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
}
