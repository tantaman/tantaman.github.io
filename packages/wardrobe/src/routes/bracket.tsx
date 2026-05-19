import { createFileRoute } from '@tanstack/react-router';
import { BracketView } from '../components/BracketView';

export const Route = createFileRoute('/bracket')({
  component: BracketView,
});
