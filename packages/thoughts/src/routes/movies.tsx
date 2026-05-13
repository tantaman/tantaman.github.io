import { createFileRoute } from '@tanstack/react-router';
import { MoviesView } from '../components/MoviesView';

export const Route = createFileRoute('/movies')({
  component: MoviesView,
});
