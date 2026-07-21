// The persistent top bar: the site wordmark + a light/dark toggle. The Rindle-demo identity control
// (dev "signed in as / switch user") is gone — the blog is read-only until authoring lands, at which
// point a real signed-in account replaces it.

import { Link } from "@tanstack/react-router";

import { ThemeToggle } from "./ThemeToggle.tsx";

export function TopBar() {
  return (
    <header className="app-topbar">
      <Link to="/" className="app-wordmark">
        tantaman<span>lands</span>
      </Link>
      <div className="app-topbar-right">
        <ThemeToggle />
      </div>
    </header>
  );
}
