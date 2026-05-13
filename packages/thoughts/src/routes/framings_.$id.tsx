import { createFileRoute } from '@tanstack/react-router';
import { FramingCanvasView } from '../components/framing/FramingCanvasView';

export const Route = createFileRoute('/framings_/$id')({
  staticData: { view: 'framing' as const, bare: true },
  component: FramingRoute,
});

function FramingRoute() {
  const { id } = Route.useParams();
  return <FramingCanvasView id={Number(id)} />;
}
