import { useMemo } from 'react';
import { useItems, useFacets, useTargets } from '../hooks/useItems';
import { ItemCard } from './ItemCard';
import { Link } from '../router';
import type { Item } from '../types';

export function WardrobeView() {
  const { items, isLoading } = useItems('all');
  const { facets } = useFacets();
  const { targets } = useTargets();

  const kept = useMemo(() => items.filter((i) => i.status === 'keep' || i.status === 'own'), [items]);

  const categoryDef = facets.find((f) => f.key === 'category');

  const grouped = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of kept) {
      const cat = it.facets.category || 'uncategorised';
      if (!m.has(cat)) m.set(cat, []);
      m.get(cat)!.push(it);
    }
    return Array.from(m.entries());
  }, [kept]);

  // Order groups by the facet definition's option order, then alphabetically for leftovers.
  const orderedGroups = useMemo(() => {
    if (!categoryDef) return grouped;
    const order = new Map(categoryDef.options.map((o, i) => [o.value, i]));
    return grouped.sort((a, b) => {
      const ai = order.get(a[0]) ?? Number.POSITIVE_INFINITY;
      const bi = order.get(b[0]) ?? Number.POSITIVE_INFINITY;
      if (ai !== bi) return ai - bi;
      return a[0].localeCompare(b[0]);
    });
  }, [grouped, categoryDef]);

  const targetMap = useMemo(() => {
    const m = new Map<string, { min: number; max: number }>();
    for (const t of targets) m.set(t.category, { min: t.min, max: t.max });
    return m;
  }, [targets]);

  const categoryLabel = (key: string) => {
    if (!categoryDef) return key;
    return categoryDef.options.find((o) => o.value === key)?.label ?? key;
  };

  return (
    <div className="wardrobe-page">
      <div className="wardrobe-page__hero">
        <h1 className="wardrobe-page__hero-title">The Set</h1>
        <div className="wardrobe-page__hero-sub">
          {kept.length === 0
            ? 'The closet has yet to be furnished.'
            : `${kept.length} ${kept.length === 1 ? 'piece' : 'pieces'} retained · ${items.length} catalogued in total`}
        </div>
      </div>

      {isLoading && <div className="page-loading"><span className="spinner" /> Drawing the inventory…</div>}

      {!isLoading && kept.length === 0 && (
        <div className="empty" style={{ maxWidth: 540, margin: '0 auto' }}>
          <h2 className="empty__title">Nothing kept yet</h2>
          <div className="empty__body">Mark items as keep or own to compose your set.</div>
          <Link to="/" className="btn">Open the archive</Link>
        </div>
      )}

      {orderedGroups.map(([cat, group]) => {
        const target = targetMap.get(cat);
        let progressCls = '';
        let progressText = '';
        if (target) {
          const within = group.length >= target.min && group.length <= target.max;
          const over = group.length > target.max;
          progressCls = within ? 'wardrobe-group__progress--met' : over ? 'wardrobe-group__progress--over' : '';
          progressText = `Target ${target.min}–${target.max}`;
        }
        return (
          <section className="wardrobe-group" key={cat}>
            <div className="wardrobe-group__head">
              <h2 className="wardrobe-group__name">{categoryLabel(cat)}</h2>
              <div className="wardrobe-group__count">
                {group.length} / {target ? `${target.min}–${target.max}` : '∞'}
              </div>
              <div className={`wardrobe-group__progress ${progressCls}`}>
                {progressText || 'No target set'}
              </div>
            </div>
            <div className="wardrobe-group__grid">
              {group.map((item) => <ItemCard key={item.id} item={item} />)}
            </div>
          </section>
        );
      })}

      {!isLoading && kept.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 56, paddingTop: 32, borderTop: '1px solid var(--hairline)' }}>
          <Link to="/settings" className="btn btn--ghost btn--small">Edit targets →</Link>
        </div>
      )}
    </div>
  );
}
