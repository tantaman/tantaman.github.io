import { createFileRoute, Outlet, useMatches } from '@tanstack/react-router';
import { DocumentsSidebar } from '../components/DocumentsSidebar';

export const Route = createFileRoute('/_documents')({
  staticData: { bare: true },
  component: DocumentsLayout,
});

function DocumentsLayout() {
  const matches = useMatches();
  const deepest = matches[matches.length - 1];
  const params = (deepest?.params ?? {}) as { id?: number };
  const currentId = params.id;
  // List view (`/documents`) renders without a sidebar — sidebar is for edit/new.
  const staticData = deepest?.staticData as { withSidebar?: boolean } | undefined;
  const showSidebar = staticData?.withSidebar === true;

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
