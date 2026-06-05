import { useContext, useMemo, useState } from 'react';
import { createProjectComment, patchProjectComment, deleteProjectComment } from '../../api';
import { AuthContext } from '../../auth-context';
import { useProject } from '../../hooks/useCache';
import { renderMarkdown } from '../../markdown';
import type { ProjectComment, ProjectDetail } from '../../types';

const nowSec = () => Math.floor(Date.now() / 1000);

function timeAgo(sec: number): string {
  const d = Math.max(0, nowSec() - sec);
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  if (d < 604800) return `${Math.floor(d / 86400)}d`;
  return `${Math.floor(d / 604800)}w`;
}

type Tab = 'talk' | 'activity';

export function ProjectConversation({ id }: { id: number }) {
  const { secret } = useContext(AuthContext);
  // Shares the SWR cache key with ProjectView; comments arrive in the hub fetch.
  const { data, mutate } = useProject(id);

  const [tab, setTab] = useState<Tab>('talk');
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [err, setErr] = useState('');

  const comments = data?.comments ?? [];

  const childrenByParent = useMemo(() => {
    const m = new Map<number | null, ProjectComment[]>();
    for (const c of comments) {
      const arr = m.get(c.parent_id) ?? [];
      arr.push(c);
      m.set(c.parent_id, arr);
    }
    return m;
  }, [comments]);

  const topLevel = useMemo(
    () => (childrenByParent.get(null) ?? []).slice().sort((a, b) => b.created_at - a.created_at),
    [childrenByParent],
  );

  const applyComments = (next: ProjectComment[], fn: () => Promise<unknown>) => {
    if (!secret || !data) return;
    setErr('');
    const nextData: ProjectDetail = { ...data, comments: next };
    mutate(nextData, { revalidate: false });
    fn().then(
      () => mutate(),
      (e: { message?: string }) => {
        setErr(e?.message || 'Something went wrong');
        mutate();
      },
    );
  };

  const post = (body: string, parentId: number | null, after: () => void) => {
    const text = body.trim();
    if (!text || !secret) return;
    const temp: ProjectComment = {
      id: -Date.now(),
      project_id: id,
      parent_id: parentId,
      body: text,
      created_at: nowSec(),
      updated_at: null,
    };
    after();
    applyComments([...comments, temp], () => createProjectComment(id, text, secret, parentId));
  };

  const saveEdit = (c: ProjectComment) => {
    const text = editText.trim();
    setEditId(null);
    if (!text || text === c.body || !secret) return;
    applyComments(
      comments.map((x) => (x.id === c.id ? { ...x, body: text, updated_at: nowSec() } : x)),
      () => patchProjectComment(id, c.id, text, secret),
    );
  };

  const remove = (c: ProjectComment) => {
    if (!secret) return;
    // Drop the comment plus any descendants, mirroring the server's cascade.
    const doomed = new Set<number>([c.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const x of comments) {
        if (x.parent_id != null && doomed.has(x.parent_id) && !doomed.has(x.id)) {
          doomed.add(x.id);
          grew = true;
        }
      }
    }
    applyComments(comments.filter((x) => !doomed.has(x.id)), () => deleteProjectComment(id, c.id, secret));
  };

  const renderComment = (c: ProjectComment) => {
    const pending = c.id < 0;
    const editable = !!secret && !pending;
    const replies = (childrenByParent.get(c.id) ?? []).slice().sort((a, b) => a.created_at - b.created_at);
    return (
      <div key={c.id} className="project-comment">
        <div className="project-comment-head">
          <span className="project-comment-time">
            {timeAgo(c.created_at)}
            {c.updated_at ? ' · edited' : ''}
          </span>
          {editable && editId !== c.id && (
            <span className="project-comment-actions">
              <button className="project-comment-action" onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(''); }}>reply</button>
              <button className="project-comment-action" onClick={() => { setEditId(c.id); setEditText(c.body); }}>edit</button>
              <button className="project-comment-action project-comment-action--danger" onClick={() => remove(c)}>delete</button>
            </span>
          )}
        </div>

        {editId === c.id ? (
          <div className="project-comment-compose">
            <textarea
              className="task-add-input project-comment-input"
              value={editText}
              autoFocus
              rows={3}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditId(null);
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit(c);
              }}
            />
            <div className="project-comment-compose-actions">
              <button className="task-add-btn" onClick={() => saveEdit(c)} disabled={!editText.trim()}>Save</button>
              <button className="project-comment-action" onClick={() => setEditId(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="project-comment-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(c.body) }} />
        )}

        {replyTo === c.id && editable && (
          <form
            className="project-comment-compose"
            onSubmit={(e) => { e.preventDefault(); post(replyText, c.id, () => { setReplyText(''); setReplyTo(null); }); }}
          >
            <textarea
              className="task-add-input project-comment-input"
              value={replyText}
              autoFocus
              rows={2}
              placeholder="Reply…"
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setReplyTo(null);
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) post(replyText, c.id, () => { setReplyText(''); setReplyTo(null); });
              }}
            />
            <div className="project-comment-compose-actions">
              <button type="submit" className="task-add-btn" disabled={!replyText.trim()}>Reply</button>
            </div>
          </form>
        )}

        {replies.length > 0 && (
          <div className="project-comment-replies">{replies.map(renderComment)}</div>
        )}
      </div>
    );
  };

  return (
    <aside className="project-conversation">
      <div className="project-rail-tabs">
        <button className={`project-rail-tab${tab === 'talk' ? ' active' : ''}`} onClick={() => setTab('talk')}>Talk</button>
        <button className={`project-rail-tab${tab === 'activity' ? ' active' : ''}`} onClick={() => setTab('activity')}>Activity</button>
      </div>

      {tab === 'talk' ? (
        <div className="project-conversation-body">
          {secret && (
            <form
              className="project-comment-compose project-comment-compose--new"
              onSubmit={(e) => { e.preventDefault(); post(draft, null, () => setDraft('')); }}
            >
              <textarea
                className="task-add-input project-comment-input"
                value={draft}
                rows={2}
                placeholder="Add to the conversation…  (⌘↵)"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) post(draft, null, () => setDraft('')); }}
              />
              <div className="project-comment-compose-actions">
                <button type="submit" className="task-add-btn" disabled={!draft.trim()}>Comment</button>
              </div>
            </form>
          )}
          {err && <div className="task-add-error">{err}</div>}
          {topLevel.length === 0 ? (
            <div className="project-conversation-empty">No comments yet.</div>
          ) : (
            <div className="project-comment-list">{topLevel.map(renderComment)}</div>
          )}
        </div>
      ) : (
        <div className="project-conversation-body">
          <div className="project-conversation-empty">Activity log lands in the next step.</div>
        </div>
      )}
    </aside>
  );
}
