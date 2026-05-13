import { createFileRoute } from '@tanstack/react-router';
import { CanvasesListView } from '../components/CanvasesListView';

export const Route = createFileRoute('/canvases')({
  staticData: { view: 'canvases' as const },
  component: CanvasesListView,
});
