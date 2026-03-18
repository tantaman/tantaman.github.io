import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Tldraw, type Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { updateCanvas } from '../api';
import { AuthContext } from '../App';
import { useCanvas } from '../hooks/useCache';

export function TldrawCanvasView({ id }: { id: number }) {
  const { secret } = useContext(AuthContext);
  const { data, error } = useCanvas(id);
  const editorRef = useRef<Editor | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loaded, setLoaded] = useState(false);

  const save = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !secret) return;
    const snapshot = JSON.stringify(editor.getSnapshot());
    updateCanvas(id, { snapshot }, secret).catch(() => {});
  }, [id, secret]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 2000);
  }, [save]);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;

    // Load existing snapshot if available
    if (data && data.snapshot && data.snapshot !== '{}') {
      try {
        const snapshot = JSON.parse(data.snapshot);
        editor.loadSnapshot(snapshot);
      } catch {
        // ignore invalid snapshots
      }
    }
    setLoaded(true);

    // Listen for changes and auto-save
    const unsub = editor.store.listen(() => {
      scheduleSave();
    }, { source: 'user', scope: 'document' });

    return () => {
      unsub();
      // Flush any pending save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        save();
      }
    };
  }, [data, scheduleSave, save]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  if (error) return <div className="thought-loading">Canvas not found</div>;
  if (!data) return <div className="thought-loading">Loading…</div>;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <a
        href="#canvases"
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 200,
          background: 'var(--tl-color-background, #fff)',
          border: '1px solid var(--tl-color-muted-2, #ccc)',
          borderRadius: 6,
          padding: '4px 12px',
          fontSize: 13,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        Back
      </a>
      <Tldraw onMount={handleMount} />
    </div>
  );
}
