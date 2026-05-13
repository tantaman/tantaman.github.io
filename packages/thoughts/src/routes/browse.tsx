import { createFileRoute } from '@tanstack/react-router';
import { BrowseView } from '../components/BrowseView';

export const Route = createFileRoute('/browse')({
  component: BrowseView,
});
