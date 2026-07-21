// The taxonomy pill row, shared by the index card and the post header. Mirrors the original site's
// facets: subject (tags), concern, form, and kind (kind=original is the one colored pill). Renders
// nothing when there is nothing to show.

export function Pills({
  tags = [],
  concern = [],
  form,
  kind,
  maxTags,
}: {
  tags?: string[];
  concern?: string[];
  form?: string | null;
  kind?: string | null;
  maxTags?: number;
}) {
  const shownTags = maxTags != null ? tags.slice(0, maxTags) : tags;
  if (shownTags.length === 0 && concern.length === 0 && !form && !kind) return null;

  return (
    <ul className="pills">
      {shownTags.map((t) => (
        <li key={`s-${t}`} className="pill pill-subject">{t}</li>
      ))}
      {concern.map((c) => (
        <li key={`c-${c}`} className="pill pill-concern">{c}</li>
      ))}
      {form ? <li className="pill pill-form">{form}</li> : null}
      {kind ? (
        <li className={`pill pill-kind-${kind === "survey" ? "survey" : "original"}`}>{kind}</li>
      ) : null}
    </ul>
  );
}
