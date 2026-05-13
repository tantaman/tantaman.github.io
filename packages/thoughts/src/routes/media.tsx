import { createFileRoute } from '@tanstack/react-router';
import { MediaView } from '../components/MediaView';

export const Route = createFileRoute('/media')({
  staticData: { view: 'media' as const },
  component: MediaView,
});
