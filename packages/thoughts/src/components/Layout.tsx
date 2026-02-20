import type { ReactNode } from 'react';
import type { Route } from '../types';
import { Sidebar } from './Sidebar';
import { TagsSidebar } from './TagsSidebar';
import { TagPills } from './TagPills';

export function Layout({
  route,
  selectedTags,
  toggleTag,
  children,
}: {
  route: Route;
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  children: ReactNode;
}) {
  return (
    <div id="thoughts-page">
      <Sidebar route={route} />
      <main className="thoughts-feed">
        <TagPills tags={selectedTags} onRemove={toggleTag} />
        {children}
      </main>
      <TagsSidebar selectedTags={selectedTags} toggleTag={toggleTag} />
    </div>
  );
}
