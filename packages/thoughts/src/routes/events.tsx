import { createFileRoute } from '@tanstack/react-router';
import { EventsView } from '../components/EventsView';

export const Route = createFileRoute('/events')({
  staticData: { view: 'events' as const },
  component: EventsView,
});
