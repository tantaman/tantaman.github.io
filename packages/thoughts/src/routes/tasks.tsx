import { useContext } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { TasksView } from '../components/TasksView';
import { TagsContext } from '../tags-context';

export const Route = createFileRoute('/tasks')({
  component: TasksRoute,
});

function TasksRoute() {
  const { selectedTags } = useContext(TagsContext);
  return <TasksView tags={selectedTags} />;
}
