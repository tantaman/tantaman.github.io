import React from 'react';
import { createFileRoute } from '@tanstack/react-router';

const TldrawCanvasView = React.lazy(() =>
  import('../components/TldrawCanvasView').then((m) => ({ default: m.TldrawCanvasView })),
);

export const Route = createFileRoute('/canvases_/$id')({
  staticData: { view: 'canvas' as const, bare: true },
  component: CanvasRoute,
});

function CanvasRoute() {
  const { id } = Route.useParams();
  return (
    <React.Suspense fallback={<div className="thought-loading">Loading…</div>}>
      <TldrawCanvasView id={Number(id)} />
    </React.Suspense>
  );
}
