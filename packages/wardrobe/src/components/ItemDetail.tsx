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
        {item.photos.length > 0 && (
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
        )}
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

        <div className="detail__facets">
          {facetDefs.map((fd) => {
            const current = item.facets[fd.key] || '';
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
                  }}
                >
                  <option value="">—</option>
                  {fd.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Fragment>
            );
          })}
        </div>

        {item.links.length > 0 && (
          <>
            <hr className="detail__rule" />
            <div className="detail__links">
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 4 }}>
                Sources
              </div>
              {item.links.map((l, idx) => (
                <a key={idx} href={l.url} target="_blank" rel="noopener noreferrer" className="link-row">
                  {l.image && <div className="link-row__thumb" style={{ backgroundImage: `url(${l.image})` }} />}
                  <div className="link-row__body">
                    <div className="link-row__title">{l.title || 'Source'}</div>
                    <div className="link-row__url">{l.url}</div>
                  </div>
                  {l.price_cents != null && <div className="link-row__price">{formatPrice(l.price_cents)}</div>}
                </a>
              ))}
            </div>
          </>
        )}

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
