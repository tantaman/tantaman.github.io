import { useContext } from 'react';
import { AuthContext } from '../App';
import { useTags, useFramings } from '../hooks/useCache';

export function TagsSidebar({
  selectedTags,
  toggleTag,
  selectedFraming,
  selectFraming,
}: {
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  selectedFraming: number | null;
  selectFraming: (id: number | null) => void;
}) {
  const { secret } = useContext(AuthContext);
  const { data } = useTags(selectedTags, secret);
  const { data: framingsData } = useFramings();
  const tags = data?.tags ?? [];
  const framings = framingsData?.framings ?? [];

  if (tags.length === 0 && framings.length === 0) return null;

  return (
    <aside className="thoughts-tags-sidebar">
      {framings.length > 0 && (
        <>
          <div className="tags-sidebar-title">Framings</div>
          <div>
            {framings.map((f) => (
              <button
                key={f.id}
                className={
                  'tags-list-item' +
                  (selectedFraming === f.id ? ' active' : '')
                }
                onClick={() => selectFraming(f.id)}
              >
                <span>{f.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {tags.length > 0 && (
        <>
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
        </>
      )}
    </aside>
  );
}
