import { createFileRoute } from '@tanstack/react-router';
import { MusicView } from '../components/MusicView';

export const Route = createFileRoute('/music')({
  component: MusicView,
});
