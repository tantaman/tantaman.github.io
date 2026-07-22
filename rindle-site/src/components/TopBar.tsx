// The persistent top bar: the local wordmark, primary app surfaces, and the light/dark toggle. CSS
// keeps the navigation subdued until the header is hovered or focused; touch devices get the links
// outright because they have no reliable hover state.

import { Link } from "@tanstack/react-router";

import { AccountControl } from "./AccountControl.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";

export function TopBar() {
  return (
    <header className="app-topbar">
      <Link to="/" className="app-wordmark">
        tantaman
      </Link>
      <div className="app-topbar-right">
        <nav className="app-nav" aria-label="Primary navigation">
          <Link to="/search">search</Link>
          <Link to="/thoughts">thoughts</Link>
          <Link to="/paste">paste</Link>
        </nav>
        <AccountControl />
        <ThemeToggle />
      </div>
    </header>
  );
}
