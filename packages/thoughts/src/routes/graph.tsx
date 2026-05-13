import { createFileRoute } from '@tanstack/react-router';
import { ThoughtGraph } from '../components/ThoughtGraph';

export const Route = createFileRoute('/graph')({
  staticData: { view: 'graph' as const, bare: true },
  component: ThoughtGraph,
});
