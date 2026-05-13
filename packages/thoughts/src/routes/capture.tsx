import { createFileRoute } from '@tanstack/react-router';
import { CaptureView } from '../components/CaptureView';

export const Route = createFileRoute('/capture')({
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === 'string' ? search.url : undefined,
    text: typeof search.text === 'string' ? search.text : undefined,
    title: typeof search.title === 'string' ? search.title : undefined,
  }),
  staticData: { view: 'capture' as const },
  component: CaptureRoute,
});

function CaptureRoute() {
  const { url, text, title } = Route.useSearch();
  return <CaptureView initialUrl={url} initialText={text} initialTitle={title} />;
}
