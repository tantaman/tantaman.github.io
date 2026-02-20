import { useEffect, useState } from 'react';
import type { Tag } from '../types';
import { getTags } from '../api';

export function TagsSidebar({ activeTag }: { activeTag: string | null }) {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    getTags().then((data) => setTags(data.tags || []));
  }, []);

  if (tags.length === 0) return null;

  return (
    <aside className="thoughts-tags-sidebar">
      <div className="tags-sidebar-title">Tags</div>
      <div>
        {tags.map((tag) => (
          <a
            key={tag.name}
            className={
              'tags-list-item' + (activeTag === tag.name ? ' active' : '')
            }
            href={`#tag-${encodeURIComponent(tag.name)}`}
          >
            <span>#{tag.name}</span>
            <span className="tags-list-count">{tag.count}</span>
          </a>
        ))}
      </div>
    </aside>
  );
}
