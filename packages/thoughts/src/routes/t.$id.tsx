import { createFileRoute } from '@tanstack/react-router';
import { ThreadView } from '../components/ThreadView';

export const Route = createFileRoute('/t/$id')({
  params: {
    parse: ({ id }) => ({ id: Number(id) }),
    stringify: ({ id }) => ({ id: String(id) }),
  },
  component: ThreadRoute,
});

function ThreadRoute() {
  const { id } = Route.useParams();
  return <ThreadView id={id} />;
}
