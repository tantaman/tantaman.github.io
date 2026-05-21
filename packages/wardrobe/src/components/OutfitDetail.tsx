import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { Link, useNavigate } from '@tanstack/react-router';
import * as api from '../api';
import { attachmentUrl } from '../api';
import { getSecret } from '../auth';
import { useItems } from '../hooks/useItems';
import type { Item } from '../types';

interface Props { id: number }

export function OutfitDetail({ id }: Props) {
  const navigate = useNavigate();
  const secret = getSecret();
  const { data: outfit, mutate, isLoading } = useSWR(
    ['/api/wardrobe/outfits', id, secret ? '1' : '0'],
    () => api.getOutfit(id, secret),
  );

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [editingOccasion, setEditingOccasion] = useState(false);
  const [draftOccasion, setDraftOccasion] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverDragging, setCoverDragging] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outfit) {
      setDraftName(outfit.name);
      setDraftOccasion(outfit.occasion ?? '');
    }
  }, [outfit?.id]);

  if (isLoading) return <div className="page-loading"><span className="spinner" /> Loading outfit…</div>;
  if (!outfit) return <div className="page-loading">Outfit not found. <Link to="/outfits">Back to outfits</Link></div>;

  const patch = async (data: Parameters<typeof api.patchOutfit>[1]) => {
    if (!secret) return;
    await api.patchOutfit(outfit.id, data, secret);
    await mutate();
  };

  const remove = async () => {
    if (!confirm('Delete this outfit? Items in it stay in the archive.')) return;
    if (!secret) return;
    await api.deleteOutfit(outfit.id, secret);
    navigate({ to: '/outfits' });
  };

  const addItem = async (itemId: number) => {
    if (!secret) return;
    await api.addItemToOutfit(outfit.id, itemId, secret);
    await mutate();
  };

  const removeMember = async (itemId: number) => {
    if (!secret) return;
    await api.removeItemFromOutfit(outfit.id, itemId, secret);
    await mutate();
  };

  const uploadCover = async (file: File) => {
    if (!secret) { setCoverError('Set the auth secret in Settings.'); return; }
    if (!file.type.startsWith('image/')) { setCoverError('Only image files.'); return; }
    setCoverError(null);
    setCoverUploading(true);
    try {
      await api.setOutfitCover(outfit.id, file, secret);
      await mutate();
    } catch (e) {
      setCoverError((e as Error).message);
    } finally {
      setCoverUploading(false);
    }
  };

  const onCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCoverDragging(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
    if (file) void uploadCover(file);
  };

  const clearCover = async () => {
    if (!secret) return;
    if (!confirm('Remove the cover photo?')) return;
    await api.removeOutfitCover(outfit.id, secret);
    await mutate();
  };

  return (
    <div className="compose">
      <div style={{ marginBottom: 6 }}>
        <Link to="/outfits" className="btn btn--ghost btn--small">← Outfits</Link>
      </div>

      {editingName ? (
        <div className="field-text">
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => { patch({ name: draftName.trim() || 'Untitled outfit' }); setEditingName(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            style={{ fontSize: 32 }}
          />
        </div>
      ) : (
        <h1
          className="compose__title"
          onClick={() => setEditingName(true)}
          style={{ cursor: 'pointer', marginBottom: 6 }}
        >
          {outfit.name}
        </h1>
      )}

      {editingOccasion ? (
        <div className="field-text">
          <input
            autoFocus
            value={draftOccasion}
            onChange={(e) => setDraftOccasion(e.target.value)}
            placeholder="Occasion (optional)"
            onBlur={() => { patch({ occasion: draftOccasion.trim() || null }); setEditingOccasion(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          />
        </div>
      ) : (
        <div
          onClick={() => setEditingOccasion(true)}
          style={{
            cursor: 'pointer',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-faint)',
            marginBottom: 28,
          }}
        >
          {outfit.occasion || '+ add occasion'}
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
            Worn / rendered
          </div>
          {outfit.cover_attachment_key && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div
                role="group"
                aria-label="Cover source"
                style={{ display: 'inline-flex', border: '1px solid var(--hairline)' }}
              >
                <button
                  className={`status-btn ${!outfit.prefer_mosaic_cover ? 'status-btn--active' : ''}`}
                  style={{ borderWidth: 0 }}
                  onClick={() => { if (outfit.prefer_mosaic_cover) void patch({ prefer_mosaic_cover: false }); }}
                  title="Use this rendering as the cover"
                >
                  Rendering
                </button>
                <button
                  className={`status-btn ${outfit.prefer_mosaic_cover ? 'status-btn--active' : ''}`}
                  style={{ borderWidth: 0, borderLeft: '1px solid var(--hairline)' }}
                  onClick={() => { if (!outfit.prefer_mosaic_cover) void patch({ prefer_mosaic_cover: true }); }}
                  title="Use the items mosaic as the cover; keep this rendering for reference"
                >
                  Items
                </button>
              </div>
              <button className="btn btn--small btn--ghost" onClick={() => coverInputRef.current?.click()} disabled={coverUploading}>
                Replace
              </button>
              <button className="btn btn--small btn--ghost" onClick={clearCover} disabled={coverUploading}>
                Remove
              </button>
            </div>
          )}
        </div>
        {outfit.cover_attachment_key ? (
          <div style={{ border: '1px solid var(--hairline)' }}>
            <img
              src={attachmentUrl(outfit.cover_attachment_key)}
              alt={`${outfit.name} worn`}
              style={{ width: '100%', display: 'block' }}
            />
            {outfit.prefer_mosaic_cover ? (
              <div style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', borderTop: '1px solid var(--hairline)' }}>
                Reference only — cards show the items mosaic.
              </div>
            ) : null}
          </div>
        ) : (
          <div
            className={`dropzone ${coverDragging ? 'dropzone--active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setCoverDragging(true); }}
            onDragLeave={() => setCoverDragging(false)}
            onDrop={onCoverDrop}
            onClick={() => coverInputRef.current?.click()}
          >
            {coverUploading
              ? 'Uploading…'
              : coverDragging
                ? 'Release to upload'
                : 'Drop or click to upload — a photo of you in the outfit, or an AI rendering'}
          </div>
        )}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadCover(f);
            e.target.value = '';
          }}
        />
        {coverError && (
          <div style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 8 }}>
            {coverError}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--hairline)', paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
          {outfit.items.length} {outfit.items.length === 1 ? 'piece' : 'pieces'}
        </div>
        <button className="btn btn--small" onClick={() => setPickerOpen(true)}>+ Add piece</button>
      </div>

      {outfit.items.length === 0 && (
        <div className="empty" style={{ marginBottom: 24 }}>
          <h2 className="empty__title">An empty outfit</h2>
          <div className="empty__body">Add pieces from the archive.</div>
          <button className="btn" onClick={() => setPickerOpen(true)}>Add the first piece</button>
        </div>
      )}

      {outfit.items.length > 0 && (
        <div className="outfit-members">
          {outfit.items.map((item) => {
            const photo = item.photos[0];
            return (
              <div key={item.id} className="outfit-member">
                <Link to="/item/$id" params={{ id: item.id }} className="outfit-member__frame">
                  {photo ? (
                    <img src={attachmentUrl(photo.key)} alt={item.name ?? 'item'} />
                  ) : item.links[0]?.image ? (
                    <img src={item.links[0].image} alt="" />
                  ) : (
                    <div className="card__empty">untitled</div>
                  )}
                </Link>
                <div className="outfit-member__meta">
                  <div className="outfit-member__name">{item.name || item.brand || 'Untitled'}</div>
                  {item.brand && <div className="outfit-member__brand">{item.brand}</div>}
                </div>
                <button className="outfit-member__remove" onClick={() => removeMember(item.id)}>Remove</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn--small" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={remove}>
          Delete outfit
        </button>
      </div>

      {pickerOpen && (
        <ItemPicker
          existingIds={new Set(outfit.items.map((i) => i.id))}
          onPick={async (id) => { await addItem(id); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function ItemPicker({
  existingIds,
  onPick,
  onClose,
}: {
  existingIds: Set<number>;
  onPick: (id: number) => Promise<void> | void;
  onClose: () => void;
}) {
  const { items, isLoading } = useItems('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item: Item) => {
      if (existingIds.has(item.id)) return false;
      if (item.status === 'cut') return false;
      if (!q) return true;
      const hay = `${item.name ?? ''} ${item.brand ?? ''} ${Object.values(item.facets).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, existingIds]);

  return (
    <>
      <div className="filter-backdrop filter-backdrop--open" style={{ display: 'block', zIndex: 200 }} onClick={onClose} />
      <div className="item-picker">
        <div className="item-picker__head">
          <h2 className="item-picker__title">Add a piece</h2>
          <button className="filter-drawer__close" onClick={onClose}>Done</button>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, brand, or facet…"
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px solid var(--hairline)',
            padding: '10px 12px',
            fontFamily: 'var(--sans)',
            fontSize: 14,
            color: 'var(--ink)',
            marginBottom: 18,
          }}
        />
        {isLoading && <div className="page-loading"><span className="spinner" /></div>}
        <div className="item-picker__grid">
          {filtered.map((item) => {
            const photo = item.photos[0];
            return (
              <button
                key={item.id}
                className="item-picker__cell"
                onClick={async () => { await onPick(item.id); }}
              >
                <div className="item-picker__frame">
                  {photo ? (
                    <img src={attachmentUrl(photo.key)} alt={item.name ?? ''} />
                  ) : item.links[0]?.image ? (
                    <img src={item.links[0].image} alt="" />
                  ) : (
                    <div className="card__empty" style={{ fontSize: 14 }}>—</div>
                  )}
                </div>
                <div className="item-picker__label">
                  <div className="item-picker__name">{item.name || item.brand || 'Untitled'}</div>
                  {item.facets.category && <div className="item-picker__cat">{item.facets.category}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
