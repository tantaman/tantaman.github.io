// The identity seam shared by Better Auth and the Rindle authority. Account/session/profile data stays
// in the private auth database; Rindle sees only this small, server-verified authorization projection.

import type { DBFieldAttribute } from "better-auth/db";

export type AccountRole = "reader" | "admin";

/** Better Auth's two server-owned profile fields. `input: false` keeps clients from assigning either
 *  their username or role through generic sign-up/update endpoints. */
export const AUTH_USER_FIELDS = {
  username: {
    type: "string",
    required: false,
    input: false,
  },
  role: {
    type: ["reader", "admin"] as ["reader", "admin"],
    required: true,
    defaultValue: "reader",
    input: false,
  },
} satisfies Record<string, DBFieldAttribute>;

/** A verified identity. `subject` is the stable external id used as the author of writes. */
export interface Identity {
  subject: string;
  username: string | null;
  displayName: string;
  role: AccountRole;
}

/** The only identity projection a named read needs. Query context never crosses the wire: the
 * browser supplies this projection while building its local view and the API supplies its verified
 * {@link Identity} while rebuilding the same named query authoritatively. */
export type QueryPrincipal = Pick<Identity, "role">;

export interface QueryContext {
  user: QueryPrincipal | null | undefined;
}

/** Resolve the inbound request's credential to a verified identity, or null when anonymous. Reads are
 *  public; only mutations require a non-null identity (server/app-api.ts). */
export interface AuthProvider {
  verify(req: Request): Promise<Identity | null>;
}

export function canPublish(identity: QueryPrincipal | null | undefined): boolean {
  return identity?.role === "admin";
}

/** The public byline snapshot stored with a comment. Keep this shared so the browser's optimistic
 * row and the server's signed-session check derive byte-for-byte the same value. */
export function commentAuthorName(
  identity: Pick<Identity, "username" | "displayName">,
): string {
  const username = identity.username?.trim();
  if (username) return `@${username}`.slice(0, 200);
  const displayName = identity.displayName.trim().replace(/\s+/g, " ");
  return (displayName || "reader").slice(0, 200);
}
