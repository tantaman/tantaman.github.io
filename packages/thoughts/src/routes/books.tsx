import { createFileRoute } from '@tanstack/react-router';
import { BooksView } from '../components/BooksView';

export const Route = createFileRoute('/books')({
  component: BooksView,
});
