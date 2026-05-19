import { createFileRoute } from '@tanstack/react-router';
import { AddItem } from '../components/AddItem';

export const Route = createFileRoute('/new')({
  component: AddItem,
});
