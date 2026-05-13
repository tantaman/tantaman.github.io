import { createFileRoute } from '@tanstack/react-router';
import { DocumentsListView } from '../components/DocumentsListView';

export const Route = createFileRoute('/_documents/documents')({
  staticData: { view: 'documents' as const, bare: true },
  component: DocumentsListView,
});
