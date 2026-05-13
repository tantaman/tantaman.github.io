import { createFileRoute, Outlet, useMatches } from '@tanstack/react-router';
import { DocumentsSidebar } from '../components/DocumentsSidebar';

export const Route = createFileRoute('/_documents')({
  staticData: { bare: true },
  component: DocumentsLayout,
});

function DocumentsLayout() {
  const matches = useMatches();
  const deepest = matches[matches.length - 1];
  const params = (deepest?.params ?? {}) as { id?: string };
  const currentId = params.id ? Number(params.id) : undefined;
  // List view (`/documents`) renders without a sidebar — sidebar is for edit/new.
  const staticData = deepest?.staticData as { view?: string } | undefined;
  const showSidebar = staticData?.view === 'document' || staticData?.view === 'document-new';

  if (!showSidebar) {
    return <Outlet />;
  }
  return (
    <>
      <DocumentsSidebar currentId={currentId} />
      <Outlet />
    </>
  );
}
