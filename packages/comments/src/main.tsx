import { render } from 'preact';
import { EngagementStrip } from './components/EngagementStrip';
import { CommentsSection } from './components/CommentsSection';
import { NotificationJewel } from './components/NotificationJewel';
import './styles.css';

// Mount engagement strip
const stripEl = document.getElementById('engagement-strip');
if (stripEl) {
  const slug = stripEl.dataset.slug!;
  render(<EngagementStrip slug={slug} />, stripEl);
}

// Lazy-mount comments section via IntersectionObserver
const commentsEl = document.getElementById('comments-section');
if (commentsEl) {
  const slug = commentsEl.dataset.slug!;
  let mounted = false;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !mounted) {
        mounted = true;
        render(<CommentsSection slug={slug} />, commentsEl);
        observer.disconnect();
      }
    },
    { rootMargin: '200px' },
  );

  observer.observe(commentsEl);
}

// Mount notification jewel
const notifEl = document.getElementById('notification-jewel');
if (notifEl) {
  render(<NotificationJewel />, notifEl);
}
