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
  role: AccountRole;
}

/** Resolve the inbound request's credential to a verified identity, or null when anonymous. Reads are
 *  public; only mutations require a non-null identity (server/app-api.ts). */
export interface AuthProvider {
  verify(req: Request): Promise<Identity | null>;
}

export function canPublish(identity: Identity | null | undefined): boolean {
  return identity?.role === "admin";
}
