import type { ListItem as ListItemType } from '../types';

interface Props {
  item: ListItemType;
  onToggle: (item: ListItemType) => void;
  onDelete: (item: ListItemType) => void;
}

export function ListItem({ item, onToggle, onDelete }: Props) {
  const checked = item.completed === 1;

  return (
    <div className={`list-item ${checked ? 'list-item--done' : ''}`}>
      <label className="list-item-check">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(item)}
        />
      </label>
      <span className="list-item-text">{item.text}</span>
      <button
        className="list-item-delete"
        title="Delete item"
        onClick={() => onDelete(item)}
      >
        &times;
      </button>
    </div>
  );
}
