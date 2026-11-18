// Maintenance mode: while the `MAINTENANCE` var is set (wrangler.jsonc), every request to the Worker
// gets the holding page below and nothing else — no SSR, no API, and, because `assets.run_worker_first`
// is on for the duration, no static asset either (the client bundle's rindle_bg-*.wasm included).
// Turning it off is the reverse: drop the var and `run_worker_first`, redeploy.
//
// `EXEMPT` below is the one hole in it, for the HOA report app. Its static files never reach the
// Worker at all — the negative `run_worker_first` rules in wrangler.jsonc route /dha-report-app/*
// straight to the asset server — so only its API needs naming here.

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Returning shortly</title>
<style>
  :root { color-scheme: light dark; --bg: #fbfaf8; --fg: #1a1a1a; --dim: #6b6b6b; }
  @media (prefers-color-scheme: dark) { :root { --bg: #14161a; --fg: #ece9e4; --dim: #8d8d8d; } }
  html, body { height: 100%; margin: 0; background: var(--bg); color: var(--fg); }
  body {
    display: grid; place-items: center; padding: 16px;
    font: 400 1.0625rem/1.6 ui-serif, Georgia, "Times New Roman", serif;
  }
  main { max-width: 28rem; text-align: center; }
  h1 { margin: 0 0 0.5rem; font-size: 1.375rem; font-weight: 500; letter-spacing: 0.01em; }
  p { margin: 0; color: var(--dim); font-size: 0.9375rem; }
</style>
</head>
<body>
<main>
  <h1>Returning shortly</h1>
  <p>tantaman.com is down for a moment. Please come back soon.</p>
</main>
</body>
</html>
`;

/** Path prefixes that keep working while maintenance is on. */
const EXEMPT = ["/api/dha/"];

/** True when the deployment is in maintenance mode. */
export function inMaintenance(env: unknown): boolean {
  const flag = (env as { MAINTENANCE?: string } | null)?.MAINTENANCE;
  return flag !== undefined && flag !== "" && flag !== "0" && flag !== "false";
}

/** True when this request is one maintenance mode lets through regardless. */
export function exemptFromMaintenance(request: Request): boolean {
  const { pathname } = new URL(request.url);
  return EXEMPT.some(
    (prefix) => pathname.startsWith(prefix) || pathname === prefix.slice(0, -1),
  );
}

/**
 * The holding page. 503 + Retry-After so crawlers treat it as temporary and keep the real pages
 * indexed; no-store so nobody holds on to it once the site is back.
 */
export function maintenanceResponse(request: Request): Response {
  const head = request.method === "HEAD";
  return new Response(head || request.method === "OPTIONS" ? null : PAGE, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": "3600",
    },
  });
}
