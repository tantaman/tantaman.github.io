import { createFileRoute } from '@tanstack/react-router';
import { DocumentEditView } from '../components/DocumentEditView';

export const Route = createFileRoute('/_documents/documents_/$id')({
  params: {
    parse: ({ id }) => ({ id: Number(id) }),
    stringify: ({ id }) => ({ id: String(id) }),
  },
  staticData: { bare: true, withSidebar: true },
  component: EditDocumentRoute,
});

function EditDocumentRoute() {
  const { id } = Route.useParams();
  return <DocumentEditView key={id} id={id} />;
}
