import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { AuthContext } from '../App';
import { createAmplification } from '../api';
import { useSWRConfig } from 'swr';
import type { Amplification } from '../types';

type SavedAmplification = Amplification & { duplicate?: boolean };

const BOOKMARKLET = "javascript:(function(){var u=encodeURIComponent(location.href);var t=encodeURIComponent(document.title||'');var s=encodeURIComponent((window.getSelection&&window.getSelection().toString())||'');window.open('https://tantaman.com/thoughts/?share_url='+u+'&share_title='+t+'&share_text='+s,'_blank');})();";
const THOUGHT_BOOKMARKLET = "javascript:(function(){var u=encodeURIComponent(location.href);var t=encodeURIComponent(document.title||'');var s=encodeURIComponent((window.getSelection&&window.getSelection().toString())||'');window.open('https://tantaman.com/thoughts/?share_url='+u+'&share_title='+t+'&share_text='+s+'&as=thought','_blank');})();";

function classifySource(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === 'x.com' || host === 'twitter.com' || host.endsWith('.twitter.com') || host.endsWith('.x.com')) return 'twitter';
    if (host === 'substack.com' || host.endsWith('.substack.com')) return 'substack';
    if (host === 'bsky.app' || host.endsWith('.bsky.app') || host.endsWith('.bsky.social')) return 'bluesky';
    if (host === 'mastodon.social' || host.endsWith('.mastodon.social')) return 'mastodon';
    return 'other';
  } catch {
    return 'other';
  }
}

interface Props {
  initialUrl?: string;
  initialText?: string;
  initialTitle?: string;
}

export function CaptureView({ initialUrl, initialText, initialTitle }: Props) {
  const { secret } = useContext(AuthContext);
  const navigate = useNavigate();
  const { mutate } = useSWRConfig();

  const [url, setUrl] = useState(initialUrl ?? '');
  const [note, setNote] = useState(initialText ?? '');
  const [source, setSource] = useState(() => classifySource(initialUrl ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedAmplification | null>(null);

  const bookmarkletRef = useRef<HTMLAnchorElement>(null);
  const thoughtBookmarkletRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (bookmarkletRef.current) bookmarkletRef.current.href = BOOKMARKLET;
    if (thoughtBookmarkletRef.current) thoughtBookmarkletRef.current.href = THOUGHT_BOOKMARKLET;
  }, []);

  useEffect(() => {
    if (initialUrl) setSource(classifySource(initialUrl));
  }, [initialUrl]);

  // If the share target sent text that's actually a URL (Android often does this), promote it.
  useEffect(() => {
    if (!initialUrl && initialText && /^https?:\/\/\S+$/.test(initialText.trim())) {
      const trimmed = initialText.trim();
      setUrl(trimmed);
      setSource(classifySource(trimmed));
      setNote('');
    }
  }, [initialUrl, initialText]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!secret) {
      setError('Set your secret in the bottom-right toggle first.');
      return;
    }
    if (!url.trim()) {
      setError('URL is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const amp = await createAmplification(url.trim(), secret, note.trim() || undefined, source);
      setSaved(amp);
      mutate('amplifications');
      mutate(`amplifications-${source}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setUrl('');
    setNote('');
    setSource('other');
    setSaved(null);
    setError(null);
    navigate({ to: '/capture', search: {}, replace: true });
  }

  if (saved) {
    return (
      <div className="events-view">
        <div className="events-header">
          <h2 className="events-title">Saved</h2>
        </div>
        <div className="capture-saved">
          <p className="capture-saved-msg">
            {saved.duplicate ? 'Already saved' : 'Captured'} — {saved.source}
          </p>
          <a className="capture-saved-link" href={saved.url} target="_blank" rel="noopener noreferrer">
            {saved.title || saved.url}
          </a>
          {saved.description && <p className="capture-saved-desc">{saved.description}</p>}
          <div className="capture-actions">
            <button type="button" onClick={reset}>Capture another</button>
            <Link className="capture-link-btn" to="/amplifications">View all</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="events-view">
      <div className="events-header">
        <h2 className="events-title">Capture</h2>
      </div>
      <form className="capture-form" onSubmit={onSave}>
        <label className="capture-label">
          URL
          <input
            className="capture-input"
            type="url"
            required
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setSource(classifySource(e.target.value));
            }}
            placeholder="https://..."
            autoFocus={!initialUrl}
          />
        </label>
        <label className="capture-label">
          Source
          <select
            className="capture-input"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="twitter">Twitter / X</option>
            <option value="substack">Substack</option>
            <option value="bluesky">Bluesky</option>
            <option value="mastodon">Mastodon</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="capture-label">
          Note {initialTitle && <span className="capture-hint">(from: {initialTitle})</span>}
          <textarea
            className="capture-input capture-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Why did you amplify this?"
          />
        </label>
        {error && <div className="capture-error">{error}</div>}
        <div className="capture-actions">
          <button type="submit" disabled={saving || !url.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>

      {!initialUrl && !initialText && (
        <div className="capture-help">
          <h3 className="capture-help-title">Install the bookmarklet</h3>
          <p>Drag a link to your bookmarks bar. Click it on any page to capture the URL.</p>
          <p>
            <a ref={bookmarkletRef} className="capture-bookmarklet" href="#">
              Amplify ▶
            </a>
            {' '}
            <a ref={thoughtBookmarkletRef} className="capture-bookmarklet" href="#">
              Bookmark ▶
            </a>
          </p>
          <p className="capture-hint">
            Amplify saves to amplifications. Bookmark opens the feed with a prefilled thought — edit, add tags, post.
          </p>
          <h3 className="capture-help-title">Mobile share sheet</h3>
          <p>
            Install this page as a PWA (Chrome/Android: menu → Install app; iOS: Share → Add to Home Screen).
            Then "Tantaman Thoughts" appears in your OS share sheet — pick it from Twitter/X, Substack,
            or any browser to land here with the URL prefilled.
          </p>
        </div>
      )}
    </div>
  );
}
