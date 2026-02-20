export function Sidebar() {
  return (
    <aside className="thoughts-sidebar">
      <nav className="thoughts-nav">
        <a href="/" className="thoughts-nav-link">Home</a>
        <a href="/tags.html" className="thoughts-nav-link">Browse</a>
        <a href="/graph.html" className="thoughts-nav-link">Graph</a>
        <a href="/thoughts/" className="thoughts-nav-link active">Thoughts</a>
        <a href="/pages/mcp.html" className="thoughts-nav-link">MCP</a>
      </nav>
    </aside>
  );
}
