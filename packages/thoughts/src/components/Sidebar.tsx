export function Sidebar() {
  return (
    <aside className="thoughts-sidebar">
      <nav className="thoughts-nav">
        <a href="/thoughts/" className="thoughts-nav-link active">Home</a>
        <a href="/thoughts/tasks" className="thoughts-nav-link">Tasks</a>
        <a href="/thoughts/events" className="thoughts-nav-link">Events</a>
        <a href="/thoughts/locations" className="thoughts-nav-link">Locations</a>
      </nav>
    </aside>
  );
}
