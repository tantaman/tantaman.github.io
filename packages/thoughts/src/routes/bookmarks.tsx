import { createFileRoute } from '@tanstack/react-router';
import { BookmarksView } from '../components/BookmarksView';

export const Route = createFileRoute('/bookmarks')({
  staticData: { view: 'bookmarks' as const },
  component: BookmarksView,
});
