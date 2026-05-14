import type { DocumentFrontmatter } from '../types';

export function FrontmatterPanel({
  frontmatter,
  onChange,
}: {
  frontmatter: DocumentFrontmatter;
  onChange: (fm: DocumentFrontmatter) => void;
}) {
  const update = <K extends keyof DocumentFrontmatter>(
    key: K,
    value: DocumentFrontmatter[K] | undefined,
  ) => {
    onChange({ ...frontmatter, [key]: value });
  };

  const parseArray = (val: string): string[] =>
    val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  return (
    <div className="doc-fm">
      <div className="doc-fm-field doc-fm-wide">
        <label>Tags (comma-separated)</label>
        <input
          value={(frontmatter.tags || []).join(', ')}
          onChange={(e) => update('tags', parseArray(e.target.value))}
        />
      </div>
      <div className="doc-fm-field doc-fm-wide">
        <label>Description</label>
        <textarea
          value={frontmatter.description || ''}
          onChange={(e) => update('description', e.target.value || undefined)}
        />
      </div>
      <div className="doc-fm-field">
        <label>Date</label>
        <input
          type="date"
          value={frontmatter.date || ''}
          onChange={(e) => update('date', e.target.value || undefined)}
        />
      </div>
      <div className="doc-fm-field">
        <label>Layout</label>
        <select
          value={frontmatter.layout || 'default'}
          onChange={(e) =>
            update('layout', e.target.value === 'default' ? undefined : e.target.value)
          }
        >
          <option value="default">default</option>
          <option value="mirrorRoom">mirrorRoom</option>
          <option value="chat">chat</option>
          <option value="bare">bare</option>
        </select>
      </div>
      <div className="doc-fm-field">
        <label>Concern (comma-separated)</label>
        <input
          value={(frontmatter.concern || []).join(', ')}
          onChange={(e) => update('concern', parseArray(e.target.value))}
        />
      </div>
      <div className="doc-fm-field">
        <label>Form</label>
        <select
          value={frontmatter.form || ''}
          onChange={(e) => update('form', e.target.value || undefined)}
        >
          <option value="">inferred</option>
          <option value="essay">essay</option>
          <option value="story">story</option>
          <option value="chat">chat</option>
          <option value="interactive">interactive</option>
          <option value="meditation">meditation</option>
          <option value="prophecy">prophecy</option>
        </select>
      </div>
      <div className="doc-fm-field">
        <label>Image URL</label>
        <input
          value={frontmatter.image || ''}
          onChange={(e) => update('image', e.target.value || undefined)}
        />
      </div>
      <div className="doc-fm-field doc-fm-checkbox">
        <input
          type="checkbox"
          id="doc-fm-wide"
          checked={!!frontmatter.wide}
          onChange={(e) => update('wide', e.target.checked || undefined)}
        />
        <label htmlFor="doc-fm-wide">Wide layout</label>
      </div>
    </div>
  );
}
