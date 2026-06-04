import { createFileRoute } from '@tanstack/react-router';
import { ProjectView } from '../components/ProjectView';

export const Route = createFileRoute('/projects_/$id')({
  params: {
    parse: ({ id }) => ({ id: Number(id) }),
    stringify: ({ id }) => ({ id: String(id) }),
  },
  component: ProjectRoute,
});

function ProjectRoute() {
  const { id } = Route.useParams();
  return <ProjectView id={id} />;
}
