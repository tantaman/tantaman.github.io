// The server trust boundary for identity. Every Rindle request derives its principal from the signed
// Better Auth session cookie; client-provided identity headers are ignored.

import type { AuthProvider, Identity } from "../shared/auth.ts";
import { getAuth } from "./auth.ts";

export async function resolveSessionIdentity(request: Request): Promise<Identity | null> {
  try {
    const auth = await getAuth(request);
    const session = await auth.api.getSession({ headers: request.headers });
    const user = session?.user;
    if (!user) return null;
    return {
      subject: user.id,
      username: typeof user.username === "string" ? user.username : null,
      role: user.role === "admin" ? "admin" : "reader",
    };
  } catch (error) {
    // Fail closed: public reads still work with no principal, while every authenticated mutation gate
    // sees an anonymous caller. Never log cookies, tokens, or user data.
    console.error(
      JSON.stringify({
        message: "auth session resolution failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return null;
  }
}

export const sessionAuth: AuthProvider = {
  verify: resolveSessionIdentity,
};
