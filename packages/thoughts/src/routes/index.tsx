import { useContext } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Feed } from '../components/Feed';
import { TagsContext } from '../tags-context';

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    prefill: typeof search.prefill === 'string' ? search.prefill : undefined,
  }),
  staticData: { view: 'feed' as const },
  component: IndexRoute,
});

function IndexRoute() {
  const { prefill } = Route.useSearch();
  const { selectedTags, selectedFraming } = useContext(TagsContext);
  return <Feed tags={selectedTags} framing={selectedFraming} prefill={prefill} />;
}
