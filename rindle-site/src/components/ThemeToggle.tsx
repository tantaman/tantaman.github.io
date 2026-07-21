// Light/dark toggle. Flips `data-theme` on <html> and persists to localStorage; the inline script in
// __root reads it back pre-paint so there is no flash on the next load. The two glyphs are swapped by
// CSS off the current `data-theme` (not React state), so SSR and hydration render identical markup.

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode / storage disabled — the toggle still works for this page */
    }
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label="Toggle color theme" title="Toggle theme">
      <span className="theme-ico theme-ico-sun" aria-hidden="true">☀</span>
      <span className="theme-ico theme-ico-moon" aria-hidden="true">☾</span>
    </button>
  );
}
