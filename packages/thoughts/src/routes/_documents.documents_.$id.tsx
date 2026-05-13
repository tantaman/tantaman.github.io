import { createFileRoute } from '@tanstack/react-router';
import { DocumentEditView } from '../components/DocumentEditView';

export const Route = createFileRoute('/_documents/documents_/$id')({
  staticData: { view: 'document' as const, bare: true },
  component: EditDocumentRoute,
});

function EditDocumentRoute() {
  const { id } = Route.useParams();
  const numericId = Number(id);
  return <DocumentEditView key={numericId} id={numericId} />;
}
