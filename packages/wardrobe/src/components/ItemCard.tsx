import type { Item, ItemStatus } from '../types';
import { attachmentUrl } from '../api';
import { Link } from '@tanstack/react-router';

function formatPrice(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  const dollars = cents / 100;
  return `$${dollars.toFixed(dollars % 1 === 0 ? 0 : 2)}`;
}

function catalogNumber(id: number): string {
  return `№ ${id.toString().padStart(3, '0')}`;
}

function statusLabel(s: ItemStatus): string {
  return { candidate: 'Cand.', shortlist: 'Short.', keep: 'Keep', own: 'Own', cut: 'Cut' }[s];
}

interface Props {
  item: Item;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function ItemCard({ item, selected, onToggleSelect }: Props) {
  const primary = item.photos[0];
  const secondary = item.photos[1];
  const linkPreview = !primary && item.links[0]?.image;
  const price = formatPrice(item.price_cents) ?? formatPrice(item.links[0]?.price_cents);
  const facetVals = ['category', 'sleeve', 'season']
    .map((k) => item.facets[k])
    .filter(Boolean);

  return (
    <div className={`card ${item.status === 'cut' ? 'card--cut' : ''} ${selected ? 'card--selected' : ''}`}>
      <Link to="/item/$id" params={{ id: item.id }}>
        <div className="card__frame">
          <span className="card__catnum">{catalogNumber(item.id)}</span>
          <span className={`card__status card__status--${item.status}`}>{statusLabel(item.status)}</span>
          {primary ? (
            <>
              <img className="card__image" src={attachmentUrl(primary.key)} alt={item.name ?? 'item'} />
              {secondary && (
                <img className="card__image card__image--secondary" src={attachmentUrl(secondary.key)} alt="" />
              )}
            </>
          ) : linkPreview ? (
            <img className="card__image" src={linkPreview} alt={item.name ?? 'item'} />
          ) : (
            <div className="card__empty">untitled</div>
          )}
        </div>
        <div className="card__label">
          <h3 className="card__name">{item.name || item.brand || 'Untitled'}</h3>
          {price && <div className="card__price">{price}</div>}
          {item.brand && <div className="card__brand">{item.brand}</div>}
          {facetVals.length > 0 && (
            <div className="card__facets">
              {facetVals.map((v) => (
                <span key={v}>{v}</span>
              ))}
            </div>
          )}
        </div>
      </Link>
      {onToggleSelect && (
        <button
          className="card__select"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect();
          }}
          aria-label={selected ? 'Deselect' : 'Select'}
        >
          {selected ? '✓' : ''}
        </button>
      )}
    </div>
  );
}
