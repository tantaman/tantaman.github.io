import { createFileRoute } from '@tanstack/react-router';
import { OutfitDetail } from '../components/OutfitDetail';

export const Route = createFileRoute('/outfits_/$id')({
  params: {
    parse: ({ id }) => ({ id: Number(id) }),
    stringify: ({ id }) => ({ id: String(id) }),
  },
  component: OutfitRoute,
});

function OutfitRoute() {
  const { id } = Route.useParams();
  return <OutfitDetail id={id} />;
}
