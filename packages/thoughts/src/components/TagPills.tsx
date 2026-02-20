export function TagPills({
  tags,
  onRemove,
}: {
  tags: string[];
  onRemove: (tag: string) => void;
}) {
  if (tags.length === 0) return null;

  return (
    <div className="tag-pills">
      {tags.map((tag) => (
        <span key={tag} className="tag-pill">
          #{tag}
          <button
            className="tag-pill-remove"
            onClick={() => onRemove(tag)}
            aria-label={`Remove ${tag} filter`}
          >
            &times;
          </button>
        </span>
      ))}
    </div>
  );
}
