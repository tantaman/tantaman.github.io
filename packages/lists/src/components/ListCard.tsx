import type { List } from '../types';

interface Props {
  list: List;
  onDelete: (id: number) => void;
}

export function ListCard({ list, onDelete }: Props) {
  const total = list.item_count ?? 0;
  const done = list.completed_count ?? 0;

  return (
    <a className="list-card" href={`#list-${list.id}`}>
      <div className="list-card-header">
        <span className="list-card-name">{list.name}</span>
        <button
          className="list-card-delete"
          title="Delete list"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm(`Delete "${list.name}"?`)) {
              onDelete(list.id);
            }
          }}
        >
          &times;
        </button>
      </div>
      {total > 0 && (
        <div className="list-card-progress">
          <div className="list-card-progress-bar">
            <div
              className="list-card-progress-fill"
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </div>
          <span className="list-card-count">{done}/{total}</span>
        </div>
      )}
    </a>
  );
}
