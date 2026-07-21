import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "../auth-client.ts";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Provider = "github" | "google";

function LoginPage() {
  const { data: session } = authClient.useSession();
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: Provider) {
    setPending(provider);
    setError(null);
    try {
      const result = await authClient.signIn.social({ provider, callbackURL: "/" });
      if (result.error) {
        setError(result.error.message || `Could not sign in with ${provider}.`);
        setPending(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not sign in with ${provider}.`);
      setPending(null);
    }
  }

  if (session?.user) {
    const label = session.user.username ? `@${session.user.username}` : session.user.name;
    return (
      <section className="login-page" aria-labelledby="login-title">
        <p className="login-kicker">account</p>
        <h1 id="login-title">You’re signed in as {label}.</h1>
        <p>Reader accounts can comment and react. Publishing remains restricted to administrators.</p>
        <Link className="login-return" to="/">
          Return to the posts →
        </Link>
      </section>
    );
  }

  return (
    <section className="login-page" aria-labelledby="login-title">
      <p className="login-kicker">account</p>
      <h1 id="login-title">Sign in to join the conversation.</h1>
      <p>
        Reading stays public. An account is only needed for comments and reactions; publishing is
        reserved for administrators.
      </p>
      <div className="login-providers">
        <button type="button" onClick={() => void signIn("github")} disabled={pending !== null}>
          {pending === "github" ? "Connecting…" : "Continue with GitHub"}
        </button>
        <button type="button" onClick={() => void signIn("google")} disabled={pending !== null}>
          {pending === "google" ? "Connecting…" : "Continue with Google"}
        </button>
      </div>
      {error ? <p className="login-error">{error}</p> : null}
      <Link className="login-return" to="/">
        ← Keep reading without an account
      </Link>
    </section>
  );
}
