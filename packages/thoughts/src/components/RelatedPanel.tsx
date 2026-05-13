import { useContext } from 'react';
import { Link } from '@tanstack/react-router';
import { AuthContext } from '../App';
import { useRelated } from '../hooks/useCache';
import type { RelatedItem, SimilarItem } from '../types';

function excerpt(body: string, maxLen = 140): string {
  const plain = body
    .replace(/\[\[(\d+)(?:\|([^\]|]+))?\]\]/g, (_, _id, title) => (title ? title.trim() : ''))
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/[#*_`~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + '…' : plain;
}

function shortDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function RelatedRow({ item }: { item: RelatedItem | SimilarItem }) {
  const score = 'score' in item ? item.score : null;
  return (
    <Link
      to="/t/$id"
      params={{ id: String(item.id) }}
      className="related-row"
      style={item.color ? { borderLeftColor: item.color } : undefined}
    >
      <div className="related-row-body">{excerpt(item.body)}</div>
      <div className="related-row-meta">
        <span>{shortDate(item.timestamp)}</span>
        {score != null && <span className="related-row-score">{score.toFixed(2)}</span>}
      </div>
    </Link>
  );
}

export function RelatedPanel({ thoughtId }: { thoughtId: number }) {
  const { secret } = useContext(AuthContext);
  const { data } = useRelated(thoughtId, secret);

  if (!data) return null;
  const linked = [...data.outbound, ...data.inbound.filter((i) => !data.outbound.some((o) => o.id === i.id))];
  if (linked.length === 0 && data.similar.length === 0) return null;

  return (
    <div className="related-panel">
      {linked.length > 0 && (
        <section className="related-section">
          <h3 className="related-heading">linked</h3>
          <div className="related-list">
            {linked.map((item) => (
              <RelatedRow key={`l-${item.id}`} item={item} />
            ))}
          </div>
        </section>
      )}
      {data.similar.length > 0 && (
        <section className="related-section">
          <h3 className="related-heading">similar</h3>
          <div className="related-list">
            {data.similar.map((item) => (
              <RelatedRow key={`s-${item.id}`} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
