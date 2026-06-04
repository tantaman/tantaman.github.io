import { createFileRoute } from '@tanstack/react-router';
import { ProjectsListView } from '../components/ProjectsListView';

export const Route = createFileRoute('/projects')({
  component: ProjectsRoute,
});

function ProjectsRoute() {
  return <ProjectsListView />;
}
