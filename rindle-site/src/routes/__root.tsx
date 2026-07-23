// The root route: the HTML document + the app frame. Inside the document, `rindle.Provider` merges
// matched loaders' SSR seeds, carries them through hydration, then swaps to the live browser engine.
// <TopBar> + <Toaster> are the persistent chrome around the matched view (`children`).
//
// Each leaf route owns its first-paint preload through `rindle.loader`; the integration owns the
// loader-data plumbing and seed→live handoff.

import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";

import { TopBar } from "../components/TopBar.tsx";
import { Toaster } from "../components/Toaster.tsx";
import { PoweredByRindle } from "../components/PoweredByRindle.tsx";
import { DevTools } from "../devtools.tsx";
import { rindle } from "../rindle-tanstack.ts";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "Tantaman" },
      { name: "theme-color", content: "#e9e6ea" },
    ],
    // System-ui throughout (matching the original site) — no web-font CDN.
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
});

// Set the theme BEFORE first paint so there's no light/dark flash: prefer the persisted choice, else
// the OS preference. Kept tiny and inlined in <head>; the ThemeToggle keeps `data-theme` in sync after.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

function RootDocument() {
  return (
    // `suppressHydrationWarning`: THEME_SCRIPT sets `data-theme` on <html> before React hydrates, so
    // the client element intentionally has an attribute the SSR output can't (the server has no way to
    // know the user's stored/OS preference). This suppresses the warning for THIS element's own
    // attributes only — content mismatches inside still surface.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <rindle.Provider>
          <TopBar />
          <main className="app-main">
            <Outlet />
          </main>
          <Toaster />
          <PoweredByRindle />
        </rindle.Provider>
        {/* Dev-only floating devtools pane (tree-shaken out of production builds). */}
        <DevTools />
        <Scripts />
      </body>
    </html>
  );
}
