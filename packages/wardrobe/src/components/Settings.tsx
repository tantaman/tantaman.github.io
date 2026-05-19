import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useFacets, useTargets } from '../hooks/useItems';
import { getSecret, setSecret } from '../auth';
import * as api from '../api';
import type { Target, FacetDef } from '../types';

export function Settings() {
  const { facets, mutate: mutateFacets } = useFacets();
  const { targets, mutate: mutateTargets } = useTargets();
  const [secret, setSecretLocal] = useState(getSecret() ?? '');
  const [secretSaved, setSecretSaved] = useState(false);

  const [draftTargets, setDraftTargets] = useState<Target[]>([]);
  const [draftFacets, setDraftFacets] = useState<FacetDef[]>([]);

  useEffect(() => { setDraftTargets(targets); }, [targets.length]);
  useEffect(() => { setDraftFacets(facets); }, [facets.length]);

  const saveSecret = () => {
    setSecret(secret.trim() || null);
    setSecretSaved(true);
    setTimeout(() => setSecretSaved(false), 1500);
  };

  const saveTargets = async () => {
    const s = getSecret();
    if (!s) { alert('Set the auth secret first.'); return; }
    await api.setTargets(draftTargets.filter((t) => t.category), s);
    await mutateTargets();
  };

  const addTarget = () => {
    setDraftTargets((prev) => [...prev, { category: '', min: 1, max: 5 }]);
  };

  const removeTarget = (i: number) => {
    setDraftTargets((prev) => prev.filter((_, idx) => idx !== i));
  };

  const saveFacets = async () => {
    const s = getSecret();
    if (!s) { alert('Set the auth secret first.'); return; }
    await api.setFacets(draftFacets, s);
    await mutateFacets();
  };

  const categoryDef = facets.find((f) => f.key === 'category');

  return (
    <div className="settings">
      <div className="section-head">
        <h1 className="section-head__title">Settings</h1>
        <Link to="/" className="btn btn--ghost btn--small">← Archive</Link>
      </div>

      <div className="settings__block">
        <h2 className="settings__heading">Authentication</h2>
        <p className="settings__lede">Your Tantamanlands shared secret. Stored only in localStorage.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecretLocal(e.target.value)}
            placeholder="secret"
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid var(--hairline)',
              padding: '8px 10px',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              color: 'var(--ink)',
            }}
          />
          <button className="btn btn--small" onClick={saveSecret}>
            {secretSaved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </div>

      <div className="settings__block">
        <h2 className="settings__heading">Targets</h2>
        <p className="settings__lede">How many of each category you want in your final set.</p>

        <div className="targets-row" style={{ marginBottom: 4 }}>
          <div className="targets-row__label">Category</div>
          <div className="targets-row__label">Min</div>
          <div className="targets-row__label">Max</div>
          <div />
        </div>

        {draftTargets.map((t, i) => (
          <div className="targets-row" key={i}>
            <select
              value={t.category}
              onChange={(e) => setDraftTargets((prev) => prev.map((x, idx) => idx === i ? { ...x, category: e.target.value } : x))}
              style={{ background: 'transparent', border: '1px solid var(--hairline)', padding: '7px 10px', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink)' }}
            >
              <option value="">—</option>
              {categoryDef?.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={t.min}
              onChange={(e) => setDraftTargets((prev) => prev.map((x, idx) => idx === i ? { ...x, min: parseInt(e.target.value, 10) || 0 } : x))}
            />
            <input
              type="number"
              min="0"
              value={t.max}
              onChange={(e) => setDraftTargets((prev) => prev.map((x, idx) => idx === i ? { ...x, max: parseInt(e.target.value, 10) || 0 } : x))}
            />
            <button className="link-row__remove" onClick={() => removeTarget(i)}>×</button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn btn--ghost btn--small" onClick={addTarget}>+ Add target</button>
          <button className="btn btn--small" onClick={saveTargets}>Save targets</button>
        </div>
      </div>

      <div className="settings__block">
        <h2 className="settings__heading">Facet schema</h2>
        <p className="settings__lede">Define the dimensions you use to tag items. Edit JSON directly — values are comma-separated <code>label:value</code> pairs, one option per line.</p>

        {draftFacets.map((fd, i) => (
          <div key={fd.key} style={{ marginBottom: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 40px', gap: 10, marginBottom: 6, alignItems: 'center' }}>
              <input
                value={fd.label}
                onChange={(e) => setDraftFacets((prev) => prev.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))}
                style={{ background: 'transparent', border: '1px solid var(--hairline)', padding: '7px 10px', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink)' }}
              />
              <input
                value={fd.key}
                disabled
                style={{ background: 'var(--paper-deep)', border: '1px solid var(--hairline)', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}
              />
              <button className="link-row__remove" onClick={() => setDraftFacets((prev) => prev.filter((_, idx) => idx !== i))}>×</button>
            </div>
            <textarea
              rows={Math.min(8, fd.options.length + 1)}
              value={fd.options.map((o) => `${o.label}:${o.value}`).join('\n')}
              onChange={(e) => {
                const lines = e.target.value.split('\n');
                const options = lines.map((line) => {
                  const [label, value] = line.split(':').map((s) => s.trim());
                  return { label: label || '', value: (value || label || '').toLowerCase() };
                }).filter((o) => o.label);
                setDraftFacets((prev) => prev.map((x, idx) => idx === i ? { ...x, options } : x));
              }}
              style={{ width: '100%', background: 'transparent', border: '1px solid var(--hairline)', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.5, color: 'var(--ink)' }}
              placeholder="Casual:casual"
            />
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            className="btn btn--ghost btn--small"
            onClick={() => {
              const key = prompt('Facet key (lowercase, e.g. "material"):')?.trim().toLowerCase();
              if (!key) return;
              const label = prompt('Facet label (e.g. "Material"):')?.trim();
              if (!label) return;
              setDraftFacets((prev) => [...prev, { key, label, options: [] }]);
            }}
          >+ Add facet</button>
          <button className="btn btn--small" onClick={saveFacets}>Save facets</button>
        </div>
      </div>
    </div>
  );
}
