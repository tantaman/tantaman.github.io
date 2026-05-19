import { createFileRoute } from '@tanstack/react-router';
import { ItemDetail } from '../components/ItemDetail';

export const Route = createFileRoute('/item/$id')({
  params: {
    parse: ({ id }) => ({ id: Number(id) }),
    stringify: ({ id }) => ({ id: String(id) }),
  },
  component: ItemDetailRoute,
});

function ItemDetailRoute() {
  const { id } = Route.useParams();
  return <ItemDetail id={id} />;
}
