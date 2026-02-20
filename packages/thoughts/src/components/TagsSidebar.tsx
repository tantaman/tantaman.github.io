import { useTags } from '../hooks/useCache';

export function TagsSidebar({
  selectedTags,
  toggleTag,
}: {
  selectedTags: string[];
  toggleTag: (tag: string) => void;
}) {
  const { data } = useTags(selectedTags);
  const tags = data?.tags ?? [];

  if (tags.length === 0) return null;

  return (
    <aside className="thoughts-tags-sidebar">
      <div className="tags-sidebar-title">Tags</div>
      <div>
        {tags.map((tag) => (
          <button
            key={tag.name}
            className={
              'tags-list-item' +
              (selectedTags.includes(tag.name) ? ' active' : '')
            }
            onClick={() => toggleTag(tag.name)}
          >
            <span>#{tag.name}</span>
            <span className="tags-list-count">{tag.count}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
