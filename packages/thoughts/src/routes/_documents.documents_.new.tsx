import { createFileRoute } from '@tanstack/react-router';
import { DocumentEditView } from '../components/DocumentEditView';

export const Route = createFileRoute('/_documents/documents_/new')({
  staticData: { view: 'document-new' as const, bare: true },
  component: NewDocumentRoute,
});

function NewDocumentRoute() {
  return <DocumentEditView key="new" />;
}
