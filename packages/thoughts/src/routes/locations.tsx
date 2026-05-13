import { createFileRoute } from '@tanstack/react-router';
import { LocationsView } from '../components/LocationsView';

export const Route = createFileRoute('/locations')({
  component: LocationsView,
});
