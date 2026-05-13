import { useContext, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Book } from '../types';
import { useBooks } from '../hooks/useCache';
import { patchBook } from '../api';
import { AuthContext } from '../App';
import { useSWRConfig } from 'swr';

export function BooksView() {
  const { data } = useBooks();
  const { mutate } = useSWRConfig();
  const { secret } = useContext(AuthContext);
  const books: Book[] = data?.books ?? [];
  const loading = !data;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit(book: Book) {
    setEditingId(book.id);
    setEditValue('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  async function submitEdit(book: Book) {
    if (!secret || !editValue.trim()) return;
    setSaving(true);
    try {
      const olMatch = editValue.match(/openlibrary\.org\/books\/(OL\w+)/);
      const body = olMatch
        ? { ol_key: olMatch[1] }
        : { title: editValue.trim() };
      const updated = await patchBook(book.id, body, secret);
      mutate('books', (prev: { books: Book[] } | undefined) => {
        if (!prev) return prev;
        return { books: prev.books.map((b) => b.id === book.id ? { ...b, ...updated } : b) };
      }, { revalidate: false });
      setEditingId(null);
      setEditValue('');
    } catch {
      mutate('books');
    } finally {
      setSaving(false);
    }
  }

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
        <div className="movies-grid">
          {books.map((book) => (
            <div key={book.id} className="movie-card">
              {book.ol_key ? (
                <a
                  className="movie-poster-link"
                  href={`https://openlibrary.org${book.ol_key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {book.cover_url ? (
                    <img
                      className="movie-poster"
                      src={book.cover_url}
                      alt={book.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="movie-poster movie-poster--placeholder">
                      <span>{book.title.charAt(0)}</span>
                    </div>
                  )}
                </a>
              ) : (
                <div className="movie-poster-link">
                  {book.cover_url ? (
                    <img
                      className="movie-poster"
                      src={book.cover_url}
                      alt={book.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="movie-poster movie-poster--placeholder">
                      <span>{book.title.charAt(0)}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="movie-info">
                <Link
                  to="/t/$id"
                  params={{ id: String(book.thought_id) }}
                  className="movie-title"
                >
                  {book.title}
                </Link>
                {book.author && <span className="movie-year">{book.author}</span>}
                {book.year && <span className="movie-year">{book.year}</span>}
                {book.description && (
                  <span className="movie-description">{book.description}</span>
                )}
                {book.reply_count > 0 && (
                  <Link
                    to="/t/$id"
                    params={{ id: String(book.thought_id) }}
                    className="movie-reply-count"
                  >
                    💬 {book.reply_count}{' '}
                    {book.reply_count === 1 ? 'reply' : 'replies'}
                  </Link>
                )}
                {secret && editingId !== book.id && (
                  <button
                    className="movie-edit-btn"
                    onClick={() => startEdit(book)}
                  >
                    Edit
                  </button>
                )}
                {editingId === book.id && (
                  <form
                    className="movie-edit-form"
                    onSubmit={(e) => { e.preventDefault(); submitEdit(book); }}
                  >
                    <input
                      className="movie-edit-input"
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Title or Open Library URL..."
                      disabled={saving}
                      autoFocus
                    />
                    <div className="movie-edit-actions">
                      <button type="submit" className="movie-edit-save" disabled={saving || !editValue.trim()}>
                        {saving ? '...' : 'Save'}
                      </button>
                      <button type="button" className="movie-edit-cancel" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
