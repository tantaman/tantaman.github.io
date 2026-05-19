import { createFileRoute } from '@tanstack/react-router';
import { WardrobeView } from '../components/WardrobeView';

export const Route = createFileRoute('/wardrobe')({
  component: WardrobeView,
});
