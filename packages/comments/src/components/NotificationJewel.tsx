import { useState, useEffect, useRef } from 'preact/hooks';
import { getSessionToken } from '../auth';
import { fetchNotifications, markNotificationsRead } from '../api';
import type { Notification } from '../types';

function timeAgo(epoch: number): string {
  const seconds = Math.floor(Date.now() / 1000) - epoch;
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationJewel() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getSessionToken();
    if (!token) return;

    fetchNotifications()
      .then((res) => {
        setUnreadCount(res.unread_count);
        setNotifications(res.notifications);
        setLoaded(true);
      })
      .catch(() => {
        setErrored(true);
      });
  }, []);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [open]);

  const token = getSessionToken();
  if (!token) return null;

  const handleToggle = () => {
    if (!loaded) return;
    const opening = !open;
    setOpen(opening);
    if (opening && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      markNotificationsRead().catch(() => {});
    }
  };

  return (
    <div class="comments-notif-wrapper" ref={wrapperRef}>
      <button
        class="comments-notif-btn"
        onClick={handleToggle}
        type="button"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {errored ? (
          <span class="comments-notif-badge comments-notif-error">x</span>
        ) : unreadCount > 0 ? (
          <span class="comments-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        ) : null}
      </button>

      {open && (
        <div class="comments-notif-dropdown">
          {notifications.length === 0 ? (
            <div class="comments-notif-empty">No notifications yet</div>
          ) : (
            notifications.map((n) => (
              <a
                key={n.id}
                href={`/${n.slug}.html#comments-section`}
                class={`comments-notif-item${!n.is_read ? ' comments-notif-unread' : ''}`}
              >
                <span class="comments-notif-name">
                  {n.commenter_name}
                  {n.commenter_tag && (
                    <span class="comments-item-tag"> #{n.commenter_tag}</span>
                  )}
                </span>
                <span class="comments-notif-body">{n.body}</span>
                <span class="comments-notif-time">{timeAgo(n.created_at)}</span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
