import { createFileRoute } from '@tanstack/react-router';
import { FramingsListView } from '../components/FramingsListView';

export const Route = createFileRoute('/framings')({
  component: FramingsListView,
});
