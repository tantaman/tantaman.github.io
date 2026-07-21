// The root route: the HTML document + the app frame. Inside the document, <RindleApp> renders the
// merged SSR seed on the server AND through hydration, then boots the in-browser wasm engine
// (client-only) and swaps to the live store — the SSR→SPA handoff. <TopBar> + <Toaster> are the
// persistent chrome around the matched view (`children`).
//
// Each LEAF route owns its own first-paint preload (its loader returns `{ rindle }`); RootDocument
// merges every matched route's slice, so a first visit to any route seeds exactly the queries it renders.

import { useMemo } from "react";
import { HeadContent, Outlet, Scripts, createRootRoute, useMatches } from "@tanstack/react-router";
import type { DehydratedState } from "@rindle/client";

import { RindleApp } from "../RindleApp.tsx";
import { TopBar } from "../components/TopBar.tsx";
import { Toaster } from "../components/Toaster.tsx";
import { DevTools } from "../devtools.tsx";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "Tantamanlands" },
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
  // Merge the dehydrated first-paint cache from EVERY matched route, so a first visit to any route
  // seeds exactly the queries it renders.
  const matches = useMatches();
  const ssrState = useMemo<DehydratedState>(() => {
    const merged: DehydratedState = {};
    for (const match of matches) {
      const slice = (match.loaderData as { rindle?: DehydratedState } | undefined)?.rindle;
      if (slice) Object.assign(merged, slice);
    }
    return merged;
  }, [matches]);

  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <RindleApp ssrState={ssrState}>
          <TopBar />
          <main className="app-main">
            <Outlet />
          </main>
          <Toaster />
        </RindleApp>
        {/* Dev-only floating devtools pane (tree-shaken out of production builds). */}
        <DevTools />
        <Scripts />
      </body>
    </html>
  );
}
