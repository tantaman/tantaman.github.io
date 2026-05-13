import { useContext } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { QuestionsView } from '../components/QuestionsView';
import { TagsContext } from '../tags-context';

export const Route = createFileRoute('/questions')({
  component: QuestionsRoute,
});

function QuestionsRoute() {
  const { selectedTags } = useContext(TagsContext);
  return <QuestionsView tags={selectedTags} />;
}
