import { Link } from "@tanstack/react-router";

const ACTIVE = { className: "is-active" };

const lanes = [
  ["Projects", "#p", "/thoughts/projects"],
  ["Tasks", "#t", "/thoughts/tasks"],
  ["Questions", "#q", "/thoughts/questions"],
  ["Events", "#e", "/thoughts/events"],
  ["Locations", "#l", "/thoughts/locations"],
  ["Books", "#b", "/thoughts/books"],
  ["Movies", "#m", "/thoughts/movies"],
  ["Music", "#a", "/thoughts/music"],
  ["Framings", "#f", "/thoughts/framings"],
] as const;

export function ThoughtsNav() {
  return (
    <aside className="thoughts-lane-nav" aria-label="Thought collections">
      <Link to="/thoughts" activeOptions={{ exact: true }} activeProps={ACTIVE}>
        <span>Thoughts</span><small>all</small>
      </Link>
      <div aria-hidden="true" />
      {lanes.map(([label, code, to]) => (
        <Link key={code} to={to} activeProps={ACTIVE}>
          <span>{label}</span><small>{code}</small>
        </Link>
      ))}
    </aside>
  );
}
