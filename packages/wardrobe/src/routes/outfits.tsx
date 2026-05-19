import { createFileRoute } from '@tanstack/react-router';
import { OutfitsView } from '../components/OutfitsView';

export const Route = createFileRoute('/outfits')({
  component: OutfitsView,
});
