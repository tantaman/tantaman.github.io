import { useState } from 'react';
import useSWR from 'swr';
import { Link, useNavigate } from '@tanstack/react-router';
import * as api from '../api';
import { attachmentUrl } from '../api';
import { getSecret } from '../auth';
import type { OutfitSummary } from '../types';

export function OutfitsView() {
  const secret = getSecret();
  const navigate = useNavigate();
  const { data, mutate, isLoading } = useSWR(
    ['/api/wardrobe/outfits', secret ? '1' : '0'],
    () => api.getOutfits(secret),
  );
  const outfits = data?.outfits ?? [];

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const create = async () => {
    if (!secret) { alert('Set the auth secret in Settings.'); return; }
    const name = newName.trim() || 'Untitled outfit';
    const outfit = await api.createOutfit({ name }, secret);
    setCreating(false);
    setNewName('');
    await mutate();
    navigate({ to: '/outfits/$id', params: { id: outfit.id } });
  };

  return (
    <div className="wardrobe-page">
      <div className="section-head">
        <h1 className="section-head__title">Outfits</h1>
        <div className="section-head__meta">{outfits.length} composed</div>
        <div className="section-head__actions">
          <button className="btn btn--small" onClick={() => setCreating(true)}>+ Compose</button>
        </div>
      </div>

      {creating && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, maxWidth: 480 }}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setCreating(false); }}
            placeholder="Outfit name — e.g., Summer weekend"
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid var(--hairline)',
              padding: '10px 12px',
              fontFamily: 'var(--sans)',
              fontSize: 14,
              color: 'var(--ink)',
            }}
          />
          <button className="btn btn--small" onClick={create}>Create</button>
          <button className="btn btn--small btn--ghost" onClick={() => setCreating(false)}>Cancel</button>
        </div>
      )}

      {isLoading && <div className="page-loading"><span className="spinner" /> Loading outfits…</div>}

      {!isLoading && outfits.length === 0 && (
        <div className="empty" style={{ maxWidth: 540, margin: '0 auto' }}>
          <h2 className="empty__title">No outfits yet</h2>
          <div className="empty__body">Compose a few — and a wardrobe becomes a system.</div>
          <button className="btn" onClick={() => setCreating(true)}>Compose the first</button>
        </div>
      )}

      {outfits.length > 0 && (
        <div className="outfits-grid">
          {outfits.map((o) => <OutfitCard key={o.id} outfit={o} />)}
        </div>
      )}
    </div>
  );
}

function OutfitCard({ outfit }: { outfit: OutfitSummary }) {
  return (
    <Link to="/outfits/$id" params={{ id: outfit.id }} className="outfit-card">
      <div className="outfit-card__frame">
        {outfit.thumbnails.length > 0 ? (
          <div className={`outfit-card__mosaic outfit-card__mosaic--${Math.min(outfit.thumbnails.length, 4)}`}>
            {outfit.thumbnails.map((t) => (
              <div
                key={t.item_id}
                className="outfit-card__cell"
                style={t.photo_key ? { backgroundImage: `url(${attachmentUrl(t.photo_key)})` } : undefined}
              >
                {!t.photo_key && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-faint)' }}>№ {t.item_id}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="card__empty">empty</div>
        )}
      </div>
      <div className="outfit-card__label">
        <h3 className="outfit-card__name">{outfit.name}</h3>
        <div className="outfit-card__meta">
          {outfit.item_ids.length} {outfit.item_ids.length === 1 ? 'piece' : 'pieces'}
          {outfit.occasion ? ` · ${outfit.occasion}` : ''}
        </div>
      </div>
    </Link>
  );
}
