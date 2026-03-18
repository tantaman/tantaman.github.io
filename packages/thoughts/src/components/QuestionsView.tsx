import { useContext, useState } from 'react';
import { patchQuestion } from '../api';
import { AuthContext } from '../App';
import { useQuestions } from '../hooks/useCache';

export function QuestionsView({ tags }: { tags: string[] }) {
  const { secret } = useContext(AuthContext);
  const [showAnswered, setShowAnswered] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const status = showAnswered ? 'all' : 'open';
  const { data, mutate } = useQuestions(status, tags);
  const allQuestions = data?.questions ?? [];
  const loading = !data;

  const questions = showAnswered
    ? allQuestions
    : allQuestions.filter((q) => q.answered_at === null);

  const toggleAnswered = async (question: typeof allQuestions[number]) => {
    if (!secret) return;
    const answered = question.answered_at === null;
    mutate(
      { questions: allQuestions.map((q) => q.id === question.id ? { ...q, answered_at: answered ? Math.floor(Date.now() / 1000) : null } : q) },
      false,
    );
    try {
      const updated = await patchQuestion(question.id, { answered }, secret);
      mutate(
        { questions: allQuestions.map((q) => (q.id === question.id ? updated : q)) },
        false,
      );
    } catch {
      mutate();
    }
  };

  return (
    <div className="tasks-view">
      <div className="tasks-header">
        <h2 className="tasks-title">Questions</h2>
        <div className="tasks-toggles">
          <label className="tasks-toggle">
            <input
              type="checkbox"
              checked={showAnswered}
              onChange={() => setShowAnswered(!showAnswered)}
            />
            Show answered
          </label>
        </div>
      </div>
      {loading ? (
        <div className="thought-loading">Loading…</div>
      ) : questions.length === 0 ? (
        <div className="thought-loading">No questions</div>
      ) : (
        <ul className="tasks-list">
          {questions.map((question) => (
            <li key={question.id} className="task-item">
              <div className="task-row">
                <input
                  type="checkbox"
                  className="task-checkbox"
                  checked={question.answered_at !== null}
                  disabled={!secret}
                  onChange={() => toggleAnswered(question)}
                  title="Mark answered"
                />
                <a
                  href={`#thought-${question.thought_id}`}
                  className={`task-title${question.answered_at !== null ? ' task-title--done' : ''}`}
                  onClick={(e) => {
                    if (question.description) {
                      e.preventDefault();
                      setExpandedId(expandedId === question.id ? null : question.id);
                    }
                  }}
                >
                  {question.title}
                </a>
              </div>
              {expandedId === question.id && (
                <div className="task-description">
                  {question.description && <p>{question.description}</p>}
                  <a href={`#thought-${question.thought_id}`} className="question-source-link">View source thought</a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
