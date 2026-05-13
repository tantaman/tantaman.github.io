import { createFileRoute } from '@tanstack/react-router';
import { FramingCanvasView } from '../components/framing/FramingCanvasView';

export const Route = createFileRoute('/framings_/$id')({
  params: {
    parse: ({ id }) => ({ id: Number(id) }),
    stringify: ({ id }) => ({ id: String(id) }),
  },
  staticData: { bare: true },
  component: FramingRoute,
});

function FramingRoute() {
  const { id } = Route.useParams();
  return <FramingCanvasView id={id} />;
}
