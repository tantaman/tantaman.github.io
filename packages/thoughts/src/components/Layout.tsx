import type { ReactNode } from 'react';
import type { Route } from '../types';
import { Sidebar } from './Sidebar';
import { TagsSidebar } from './TagsSidebar';

export function Layout({
  route,
  children,
}: {
  route: Route;
  children: ReactNode;
}) {
  return (
    <div id="thoughts-page">
      <Sidebar route={route} />
      <main className="thoughts-feed">{children}</main>
      <TagsSidebar activeTag={route.view === 'tag' ? route.tag : null} />
    </div>
  );
}
