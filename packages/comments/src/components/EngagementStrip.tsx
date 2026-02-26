import { useState, useEffect } from 'preact/hooks';
import { fetchComments, toggleLike } from '../api';
import { getVisitorId } from '../auth';
import { ShareButton } from './ShareButton';

interface Props {
  slug: string;
}

export function EngagementStrip({ slug }: Props) {
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const visitorId = getVisitorId();
    fetchComments(slug, visitorId)
      .then((data) => {
        setLikeCount(data.like_count);
        setLiked(data.liked);
        setCommentCount(data.comments.filter((c) => !c.deleted).length);
      })
      .catch(() => {});
  }, [slug]);

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const visitorId = getVisitorId();
      const result = await toggleLike(slug, visitorId);
      setLiked(result.liked);
      setLikeCount(result.like_count);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const scrollToComments = () => {
    document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div class="comments-engagement-strip">
      <button
        class={`comments-like-btn ${liked ? 'comments-liked' : ''}`}
        onClick={handleLike}
        type="button"
        disabled={loading}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {likeCount > 0 && <span>{likeCount}</span>}
      </button>

      <button class="comments-comment-btn" onClick={scrollToComments} type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {commentCount > 0 && <span>{commentCount}</span>}
      </button>

      <ShareButton slug={slug} />
    </div>
  );
}
