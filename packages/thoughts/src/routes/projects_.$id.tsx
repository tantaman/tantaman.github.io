import { createFileRoute } from '@tanstack/react-router';
import { ProjectWorkbench } from '../components/projects/ProjectWorkbench';

export const Route = createFileRoute('/projects_/$id')({
  staticData: { bare: true },
  params: {
    parse: ({ id }) => ({ id: Number(id) }),
    stringify: ({ id }) => ({ id: String(id) }),
  },
  component: ProjectRoute,
});

function ProjectRoute() {
  const { id } = Route.useParams();
  return <ProjectWorkbench projectId={id} />;
}
