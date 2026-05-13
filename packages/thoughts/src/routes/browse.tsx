import { createFileRoute } from '@tanstack/react-router';
import { BrowseView } from '../components/BrowseView';

export const Route = createFileRoute('/browse')({
  staticData: { view: 'browse' as const },
  component: BrowseView,
});
