import { useState } from 'preact/hooks';

interface Props {
  onSubmit: (body: string) => Promise<void>;
  placeholder?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}

export function CommentForm({ onSubmit, placeholder, autoFocus, onCancel }: Props) {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setError('');
    setLoading(true);
    try {
      await onSubmit(trimmed);
      setBody('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form class="comments-form" onSubmit={handleSubmit}>
      <textarea
        class="comments-textarea"
        value={body}
        onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
        placeholder={placeholder || 'Write a comment...'}
        maxLength={2000}
        rows={3}
        autoFocus={autoFocus}
      />
      <div class="comments-form-footer">
        <span class="comments-char-count">{body.length}/2000</span>
        <div class="comments-form-actions">
          {onCancel && (
            <button type="button" class="comments-btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            type="submit"
            class="comments-btn-primary"
            disabled={loading || !body.trim()}
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
      {error && <p class="comments-error">{error}</p>}
    </form>
  );
}
