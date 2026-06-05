import { createFileRoute } from '@tanstack/react-router';
import { ProjectWorkbench } from '../components/projects/ProjectWorkbench';

export const Route = createFileRoute('/projects')({
  staticData: { bare: true },
  component: ProjectsRoute,
});

function ProjectsRoute() {
  return <ProjectWorkbench projectId={null} />;
}
