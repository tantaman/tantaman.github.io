// Better Auth CLI schema source. This mirrors server/auth.ts without importing runtime bindings:
//   pnpm dlx @better-auth/cli@latest generate --config ./auth.cli.ts

import Database from "better-sqlite3";
import { betterAuth } from "better-auth";

import { AUTH_USER_FIELDS } from "./shared/auth.ts";

export const auth = betterAuth({
  database: new Database(":memory:"),
  emailAndPassword: { enabled: false },
  socialProviders: {
    github: { clientId: "schema", clientSecret: "schema" },
    google: { clientId: "schema", clientSecret: "schema" },
  },
  user: { additionalFields: AUTH_USER_FIELDS },
});
