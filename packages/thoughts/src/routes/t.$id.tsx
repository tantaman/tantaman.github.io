import { createFileRoute } from '@tanstack/react-router';
import { ThreadView } from '../components/ThreadView';

export const Route = createFileRoute('/t/$id')({
  staticData: { view: 'thread' as const },
  component: ThreadRoute,
});

function ThreadRoute() {
  const { id } = Route.useParams();
  return <ThreadView id={Number(id)} />;
}
