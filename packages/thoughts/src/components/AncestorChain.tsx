import { Link } from '@tanstack/react-router';
import type { Ancestor } from '../types';

function excerpt(body: string, maxLen = 220): string {
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

export function AncestorChain({ ancestors }: { ancestors: Ancestor[] }) {
  if (!ancestors || ancestors.length === 0) return null;
  return (
    <div className="ancestor-chain">
      <div className="ancestor-chain-label">in reply to</div>
      {ancestors.map((a, i) => (
        <Link
          key={a.id}
          to="/t/$id"
          params={{ id: String(a.id) }}
          className="ancestor-card"
          style={a.color ? { borderLeftColor: a.color } : undefined}
          data-depth={ancestors.length - 1 - i}
        >
          <div className="ancestor-body">{excerpt(a.body)}</div>
          <div className="ancestor-meta">
            <span>{shortDate(a.timestamp)}</span>
          </div>
        </Link>
      ))}
      <div className="ancestor-chain-arrow" aria-hidden>↓</div>
    </div>
  );
}
