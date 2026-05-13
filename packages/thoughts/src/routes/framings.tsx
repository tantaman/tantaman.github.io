import { createFileRoute } from '@tanstack/react-router';
import { FramingsListView } from '../components/FramingsListView';

export const Route = createFileRoute('/framings')({
  staticData: { view: 'framings' as const },
  component: FramingsListView,
});
