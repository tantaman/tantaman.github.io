import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import * as api from '../api';
import { getSecret } from '../auth';
import { useFacets } from '../hooks/useItems';
import type { ItemStatus } from '../types';

interface LinkDraft {
  url: string;
  title?: string;
  image?: string;
  price_cents?: number;
}

export function AddItem() {
  const navigate = useNavigate();
  const { facets: facetDefs } = useFacets();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [notes, setNotes] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [linkUrl, setLinkUrl] = useState('');
  const [links, setLinks] = useState<LinkDraft[]>([]);
  const [status] = useState<ItemStatus>('candidate');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  // Listen for clipboard paste anywhere on the page
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const newFiles: File[] = [];
      for (const it of items) {
        if (it.type.startsWith('image/')) {
          const f = it.getAsFile();
          if (f) newFiles.push(f);
        }
      }
      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (dropped.length > 0) setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const addLink = () => {
    if (!linkUrl.trim()) return;
    setLinks((prev) => [...prev, { url: linkUrl.trim() }]);
    setLinkUrl('');
  };

  const removeLink = (idx: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    const secret = getSecret();
    if (!secret) {
      setError('No auth secret. Set one in Settings.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const priceCents = priceStr ? Math.round(parseFloat(priceStr) * 100) : null;
      const item = await api.createItem(
        {
          name: name.trim() || undefined,
          brand: brand.trim() || undefined,
          notes: notes.trim() || undefined,
          facets: picked,
          status,
          price_cents: priceCents,
          links,
        },
        files,
        secret,
      );
      navigate({ to: '/item/$id', params: { id: item.id } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="compose">
      <h1 className="compose__title">Acquire a piece</h1>

      <div className="compose__row">
        <div className="compose__label">Photos</div>
        <div>
          <div
            className={`dropzone ${dragging ? 'dropzone--active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {dragging ? 'Release to add' : 'Drop, click, or paste to upload — up to many'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                const fs = Array.from(e.target.files ?? []);
                if (fs.length > 0) setFiles((prev) => [...prev, ...fs]);
              }}
            />
          </div>
          {previews.length > 0 && (
            <div className="dropzone__preview">
              {previews.map((src, idx) => (
                <div key={idx} className="dropzone__thumb" style={{ backgroundImage: `url(${src})` }}>
                  <span className="dropzone__thumb-x" onClick={(e) => { e.stopPropagation(); removeFile(idx); }}>×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="compose__row">
        <div className="compose__label">Name</div>
        <div className="field-text">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Linen overshirt" />
        </div>
      </div>

      <div className="compose__row">
        <div className="compose__label">Brand</div>
        <div className="field-text">
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Drake's, Uniqlo, Visvim…" />
        </div>
      </div>

      <div className="compose__row">
        <div className="compose__label">Price</div>
        <div className="field-text">
          <input
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
          />
        </div>
      </div>

      <div className="compose__row">
        <div className="compose__label">Facets</div>
        <div className="facet-grid">
          {facetDefs.map((fd) => (
            <div key={fd.key} className="facet-cell">
              <div className="facet-cell__label">{fd.label}</div>
              <select
                className="facet-cell__select"
                value={picked[fd.key] ?? ''}
                onChange={(e) => setPicked((prev) => ({ ...prev, [fd.key]: e.target.value }))}
              >
                <option value="">—</option>
                {fd.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="compose__row">
        <div className="compose__label">Links</div>
        <div>
          {links.length > 0 && (
            <div className="detail__links" style={{ marginBottom: 12 }}>
              {links.map((l, idx) => (
                <div key={idx} className="link-row">
                  <div className="link-row__body">
                    <div className="link-row__url">{l.url}</div>
                  </div>
                  <button className="link-row__remove" onClick={() => removeLink(idx)}>Remove</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
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
            <button className="btn btn--small btn--ghost" onClick={addLink}>Add</button>
          </div>
        </div>
      </div>

      <div className="compose__row">
        <div className="compose__label">Notes</div>
        <div className="field-text">
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Material, fit, why you're considering it…"
          />
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 11, padding: '12px 0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {error}
        </div>
      )}

      <div className="compose__actions">
        <button className="btn btn--ghost" onClick={() => navigate({ to: '/' })}>Cancel</button>
        <button className="btn" onClick={submit} disabled={submitting}>
          {submitting ? 'Saving…' : 'Catalogue'}
        </button>
      </div>
    </div>
  );
}
