import { createFileRoute } from '@tanstack/react-router';
import { AmplificationsView } from '../components/AmplificationsView';

export const Route = createFileRoute('/amplifications')({
  staticData: { view: 'amplifications' as const },
  component: AmplificationsView,
});
