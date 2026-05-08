import type { ReactNode } from 'react';
import type { Route } from '../types';
import { Sidebar } from './Sidebar';
import { TagsSidebar } from './TagsSidebar';
import { TagPills } from './TagPills';

export function Layout({
  route,
  selectedTags,
  toggleTag,
  selectedFraming,
  selectFraming,
  children,
}: {
  route: Route;
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  selectedFraming: number | null;
  selectFraming: (id: number | null) => void;
  children: ReactNode;
}) {
  if (
    route.view === 'framing' ||
    route.view === 'graph' ||
    route.view === 'canvas' ||
    route.view === 'document' ||
    route.view === 'document-new'
  ) {
    return <div id="thoughts-page">{children}</div>;
  }

  return (
    <div id="thoughts-page">
      <Sidebar route={route} />
      <main className="thoughts-feed">
        <TagPills tags={selectedTags} onRemove={toggleTag} />
        {children}
      </main>
      <TagsSidebar selectedTags={selectedTags} toggleTag={toggleTag} selectedFraming={selectedFraming} selectFraming={selectFraming} />
    </div>
  );
}
