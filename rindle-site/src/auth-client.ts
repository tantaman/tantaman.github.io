import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { AUTH_USER_FIELDS } from "../shared/auth.ts";

// Same-origin only. There is intentionally no anonymous plugin: production readers remain
// sessionless until they explicitly sign in. `ensureDevelopmentSession` is the local authoring-only
// exception and resolves to the reserved owner account before Rindle boots.
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [inferAdditionalFields({ user: AUTH_USER_FIELDS })],
});

/** `pnpm dev` is a private authoring environment: establish the local Tantaman owner session before
 * the optimistic client snapshots its acting principal. The endpoint is absent in production. */
export async function ensureDevelopmentSession() {
  let session = await authClient.getSession();
  if (!import.meta.env.DEV) return session;
  if (session.data?.user.username === "tantaman" && session.data.user.role === "admin") {
    return session;
  }

  const response = await fetch("/api/auth/dev-login", { method: "POST" });
  if (!response.ok) {
    throw new Error(`Could not establish the local author session (${response.status}).`);
  }
  // The bootstrap is a custom route rather than a built-in Better Auth client action, so explicitly
  // invalidate the reactive session atom used by AccountControl and the authoring gate.
  authClient.$store.notify("$sessionSignal");
  session = await authClient.getSession({ query: { disableCookieCache: true } });
  return session;
}
