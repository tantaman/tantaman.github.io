import { useState, useEffect, useContext } from 'react';
import { AuthContext } from './App';
import { getPosts, deletePost } from './api';
import type { PostSummary } from './types';

export function PostList() {
  const { secret } = useContext(AuthContext);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!secret) return;
    setLoading(true);
    getPosts(secret, filter)
      .then((r) => {
        setPosts(r.posts);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [secret, filter]);

  const handleDelete = async (id: number, title: string) => {
    if (!secret) return;
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await deletePost(secret, id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="pe-list">
      <div className="pe-list-header">
        <h1>Posts</h1>
        <div className="pe-list-actions">
          <select
            className="pe-filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="draft">Drafts</option>
            <option value="published">Published</option>
          </select>
          <a href="#new" className="pe-new-btn">
            + New Post
          </a>
        </div>
      </div>

      {loading && <div className="pe-loading">Loading...</div>}
      {error && <div className="pe-error">{error}</div>}

      {!loading && !error && posts.length === 0 && (
        <div className="pe-empty">No posts yet.</div>
      )}

      {posts.map((post) => (
        <div key={post.id} className="pe-post-item">
          <div className="pe-post-item-main">
            <a href={`#edit-${post.id}`} className="pe-post-item-title">
              {post.title || 'Untitled'}
            </a>
            <div className="pe-post-item-meta">
              <span
                className={`pe-status-badge pe-status-${post.status}`}
              >
                {post.status}
              </span>
              {' · '}
              {formatDate(post.updated_at)}
              {post.slug && ` · /${post.slug}`}
            </div>
          </div>
          <button
            className="pe-delete-btn"
            onClick={() => handleDelete(post.id, post.title)}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
