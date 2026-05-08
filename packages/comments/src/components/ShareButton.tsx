import { useState, useEffect, useRef } from 'preact/hooks';

interface Props {
  slug: string;
}

type Status = 'idle' | 'copied' | 'loading';

export function ShareButton({ slug }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  const url = window.location.href;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setStatus('copied');
    setTimeout(() => {
      setStatus('idle');
      setOpen(false);
    }, 1500);
  };

  const handleStoryImage = async () => {
    setStatus('loading');
    try {
      const resp = await fetch(`https://tantaman.com/api/ig-card/${slug}`);
      if (!resp.ok) throw new Error('Failed to fetch');
      const blob = await resp.blob();
      const file = new File([blob], `${slug}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${slug}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      // User cancelled or fetch failed
    }
    setStatus('idle');
    setOpen(false);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: document.title, url });
    } catch {
      // User cancelled
    }
    setOpen(false);
  };

  return (
    <div class="comments-share-wrapper" ref={wrapperRef}>
      <button
        class="comments-share-btn"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        {status === 'copied' ? 'Copied!' : 'Share'}
      </button>

      {open && (
        <div class="comments-share-menu">
          <button class="comments-share-menu-item" onClick={handleCopyLink} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Copy link
          </button>
          <button
            class="comments-share-menu-item"
            onClick={handleStoryImage}
            type="button"
            disabled={status === 'loading'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {status === 'loading' ? 'Loading…' : 'Story image'}
          </button>
          {typeof navigator.share === 'function' && (
            <button class="comments-share-menu-item" onClick={handleNativeShare} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
