import { createFileRoute } from '@tanstack/react-router';
import { DocumentsListView } from '../components/DocumentsListView';

export const Route = createFileRoute('/_documents/documents')({
  staticData: { bare: false },
  component: DocumentsListView,
});
