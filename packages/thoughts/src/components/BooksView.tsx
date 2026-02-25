import type { Book } from '../types';
import { useBooks } from '../hooks/useCache';

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function BooksView() {
  const { data } = useBooks();
  const books: Book[] = data?.books ?? [];
  const loading = !data;

  return (
    <div className="events-view">
      <div className="events-header">
        <h2 className="events-title">Books</h2>
      </div>
      {loading ? (
        <div className="thought-loading">Loading...</div>
      ) : books.length === 0 ? (
        <div className="thought-loading">No books yet.</div>
      ) : (
        <ul className="events-list">
          {books.map((book) => (
            <li key={book.id} className="event-item">
              <span className="event-title">{book.title}</span>
              {book.description && (
                <span className="event-description">{book.description}</span>
              )}
              {book.created_at > 0 && (
                <span className="event-time">{formatDate(book.created_at)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
