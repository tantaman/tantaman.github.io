import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { AUTH_USER_FIELDS } from "../shared/auth.ts";

// Same-origin only. There is intentionally no anonymous plugin and no automatic session creation:
// readers remain sessionless until they explicitly sign in.
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [inferAdditionalFields({ user: AUTH_USER_FIELDS })],
});
