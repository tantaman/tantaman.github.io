import { createFileRoute } from '@tanstack/react-router';
import { MusicView } from '../components/MusicView';

export const Route = createFileRoute('/music')({
  staticData: { view: 'music' as const },
  component: MusicView,
});
