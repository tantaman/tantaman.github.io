import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TagsSidebar } from './TagsSidebar';
import { TagPills } from './TagPills';

export function Layout({
  selectedTags,
  toggleTag,
  selectedFraming,
  selectFraming,
  children,
}: {
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  selectedFraming: number | null;
  selectFraming: (id: number | null) => void;
  children: ReactNode;
}) {
  return (
    <div id="thoughts-page">
      <Sidebar />
      <main className="thoughts-feed">
        <TagPills tags={selectedTags} onRemove={toggleTag} />
        {children}
      </main>
      <TagsSidebar selectedTags={selectedTags} toggleTag={toggleTag} selectedFraming={selectedFraming} selectFraming={selectFraming} />
    </div>
  );
}
