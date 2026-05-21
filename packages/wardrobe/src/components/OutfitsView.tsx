import { useState } from 'react';
import useSWR from 'swr';
import { Link, useNavigate } from '@tanstack/react-router';
import * as api from '../api';
import { attachmentUrl } from '../api';
import { getSecret } from '../auth';
import type { OutfitSummary } from '../types';

interface DraftOutfit {
  name: string;
  occasion?: string;
  notes?: string;
  item_ids: number[];
}

// Parse a paste into one or more outfit drafts. Accepts:
//   - A single JSON object {name, occasion?, notes?, item_ids}
//   - A JSON array of those
//   - The markdown format the wardrobe export uses — each `### Name` is one
//     outfit, `**Occasion:**` lines set the occasion, `№ NNN` references are
//     extracted as item ids, and other prose collects as notes.
function parseOutfits(text: string): { drafts: DraftOutfit[]; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { drafts: [], error: 'Paste an outfit definition first.' };

  // JSON path
  try {
    const parsed = JSON.parse(trimmed);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const drafts: DraftOutfit[] = [];
    for (const obj of arr) {
      if (!obj || typeof obj !== 'object') continue;
      const o = obj as Record<string, unknown>;
      const ids = Array.isArray(o.item_ids)
        ? (o.item_ids as unknown[])
            .map((v) => (typeof v === 'number' ? v : parseInt(String(v), 10)))
            .filter((n) => Number.isFinite(n) && n > 0)
        : [];
      if (ids.length === 0) continue;
      drafts.push({
        name: typeof o.name === 'string' && o.name.trim() ? o.name.trim() : 'Untitled outfit',
        occasion: typeof o.occasion === 'string' && o.occasion.trim() ? o.occasion.trim() : undefined,
        notes: typeof o.notes === 'string' && o.notes.trim() ? o.notes.trim() : undefined,
        item_ids: Array.from(new Set(ids)),
      });
    }
    if (drafts.length === 0) return { drafts: [], error: 'JSON parsed but no outfit had item_ids.' };
    return { drafts };
  } catch {
    // fall through to markdown parsing
  }

  // Markdown path — split on `### ` if any, else treat the whole thing as one outfit.
  const hasHeadings = /^###\s/m.test(trimmed);
  const blocks = hasHeadings
    ? trimmed.split(/^###\s+/m).slice(1)
    : [trimmed];

  const drafts: DraftOutfit[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    let name = '';
    let occasion: string | undefined;
    const noteLines: string[] = [];
    const ids: number[] = [];
    let firstNonEmptyTaken = false;

    for (const ln of lines) {
      for (const m of ln.matchAll(/№\s*(\d+)/g)) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > 0) ids.push(n);
      }
      const trimLn = ln.trim();
      if (!trimLn) continue;
      if (!firstNonEmptyTaken && !/^[-*]\s/.test(trimLn) && !/^\*\*/.test(trimLn)) {
        // First textual line becomes the name (handles `Summer Linen — weekend`).
        const dash = trimLn.match(/^(.+?)\s+[—–-]\s+(.+)$/);
        if (dash) {
          name = dash[1].trim();
          occasion = dash[2].trim();
        } else {
          name = trimLn;
        }
        firstNonEmptyTaken = true;
        continue;
      }
      const occ = trimLn.match(/^\*\*Occasion:\*\*\s*(.+)$/i);
      if (occ) { occasion = occ[1].trim(); continue; }
      if (/^\*\*Pieces?:\*\*$/i.test(trimLn)) continue;
      if (/^[-*]\s.*№/.test(trimLn)) continue; // piece-list bullet — ids already grabbed
      if (/^\*\*/.test(trimLn)) continue; // other bold metadata we don't care about
      noteLines.push(ln);
    }
    if (ids.length === 0) continue;
    drafts.push({
      name: name || 'Untitled outfit',
      occasion,
      notes: noteLines.join('\n').trim() || undefined,
      item_ids: Array.from(new Set(ids)),
    });
  }
  if (drafts.length === 0) {
    return { drafts: [], error: 'No outfits found — paste JSON or text containing № NNN item references.' };
  }
  return { drafts };
}

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

  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const create = async () => {
    if (!secret) { alert('Set the auth secret in Settings.'); return; }
    const name = newName.trim() || 'Untitled outfit';
    const outfit = await api.createOutfit({ name }, secret);
    setCreating(false);
    setNewName('');
    await mutate();
    navigate({ to: '/outfits/$id', params: { id: outfit.id } });
  };

  const runImport = async () => {
    if (!secret) { alert('Set the auth secret in Settings.'); return; }
    setImportError(null);
    setImportResult(null);
    const { drafts, error } = parseOutfits(importText);
    if (error || drafts.length === 0) {
      setImportError(error ?? 'Nothing to import.');
      return;
    }
    setImportBusy(true);
    try {
      const created: { id: number; name: string; requested: number; matched: number }[] = [];
      for (const d of drafts) {
        const o = await api.createOutfit(d, secret);
        const matched = Array.isArray((o as { item_ids?: number[] }).item_ids)
          ? (o as { item_ids: number[] }).item_ids.length
          : d.item_ids.length;
        created.push({ id: o.id, name: o.name, requested: d.item_ids.length, matched });
      }
      await mutate();
      if (created.length === 1) {
        const c = created[0];
        const dropped = c.requested - c.matched;
        if (dropped > 0) {
          setImportResult(`Imported "${c.name}" — ${c.matched}/${c.requested} pieces matched (${dropped} unknown id${dropped === 1 ? '' : 's'} dropped).`);
        } else {
          navigate({ to: '/outfits/$id', params: { id: c.id } });
          return;
        }
      } else {
        const totalReq = created.reduce((s, c) => s + c.requested, 0);
        const totalMatch = created.reduce((s, c) => s + c.matched, 0);
        setImportResult(`Imported ${created.length} outfits — ${totalMatch}/${totalReq} pieces matched.`);
      }
      setImportText('');
    } catch (e) {
      setImportError((e as Error).message);
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="wardrobe-page">
      <div className="section-head">
        <h1 className="section-head__title">Outfits</h1>
        <div className="section-head__meta">{outfits.length} composed</div>
        <div className="section-head__actions">
          <button className="btn btn--small btn--ghost" onClick={() => { setImporting(true); setCreating(false); }}>Import</button>
          <button className="btn btn--small" onClick={() => { setCreating(true); setImporting(false); }}>+ Compose</button>
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

      {importing && (
        <div style={{ marginBottom: 32, maxWidth: 720 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 8 }}>
            Paste outfit(s) — JSON or markdown with № NNN references
          </div>
          <textarea
            autoFocus
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={10}
            placeholder={`{"name":"Summer Linen","occasion":"weekend","item_ids":[12,47,3]}\n\n— or —\n\n### Summer Linen\n**Occasion:** weekend\n**Pieces:**\n- № 012 · Linen Overshirt\n- № 047 · White Tee\n- № 003 · Espadrilles`}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px solid var(--hairline)',
              padding: '12px',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              color: 'var(--ink)',
              resize: 'vertical',
            }}
          />
          {importError && (
            <div style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 8 }}>
              {importError}
            </div>
          )}
          {importResult && (
            <div style={{ color: 'var(--sage)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 8 }}>
              {importResult}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn--small" onClick={runImport} disabled={importBusy}>
              {importBusy ? 'Importing…' : 'Import'}
            </button>
            <button className="btn btn--small btn--ghost" onClick={() => { setImporting(false); setImportText(''); setImportError(null); setImportResult(null); }}>
              Close
            </button>
          </div>
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
        {outfit.cover_attachment_key ? (
          <div
            className="outfit-card__cover"
            style={{ backgroundImage: `url(${attachmentUrl(outfit.cover_attachment_key)})` }}
          />
        ) : outfit.thumbnails.length > 0 ? (
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
