import { createFileRoute } from '@tanstack/react-router';
import { CaptureView } from '../components/CaptureView';

type CaptureSearch = { url?: string; text?: string; title?: string };

export const Route = createFileRoute('/capture')({
  validateSearch: (search: Record<string, unknown>): CaptureSearch => {
    const out: CaptureSearch = {};
    if (typeof search.url === 'string') out.url = search.url;
    if (typeof search.text === 'string') out.text = search.text;
    if (typeof search.title === 'string') out.title = search.title;
    return out;
  },
  staticData: { view: 'capture' as const },
  component: CaptureRoute,
});

function CaptureRoute() {
  const { url, text, title } = Route.useSearch();
  return <CaptureView initialUrl={url} initialText={text} initialTitle={title} />;
}
