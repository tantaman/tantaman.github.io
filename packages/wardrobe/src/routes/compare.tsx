import { createFileRoute } from '@tanstack/react-router';
import { CompareView } from '../components/CompareView';

type CompareSearch = { ids?: string };

export const Route = createFileRoute('/compare')({
  validateSearch: (search: Record<string, unknown>): CompareSearch =>
    typeof search.ids === 'string' ? { ids: search.ids } : {},
  component: CompareRoute,
});

function CompareRoute() {
  const { ids } = Route.useSearch();
  return <CompareView idsParam={ids ?? ''} />;
}
