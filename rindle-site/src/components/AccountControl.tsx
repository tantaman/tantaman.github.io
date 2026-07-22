import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { authClient } from "../auth-client.ts";
import { useHydrated } from "../lib/hydration.ts";

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.75 19c.55-3.25 2.7-5 6.25-5s5.7 1.75 6.25 5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function AccountControl() {
  const { data: session } = authClient.useSession();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (container.current && !container.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const user = hydrated ? session?.user : undefined;
  if (!user) {
    return (
      <Link className="account-trigger account-sign-in" to="/login" aria-label="Sign in">
        <AccountIcon />
        <span>sign in</span>
      </Link>
    );
  }

  const label = user.username ? `@${user.username}` : user.name || user.email;

  async function signOut() {
    setOpen(false);
    await authClient.signOut();
    window.location.assign("/");
  }

  return (
    <div className="account-control" ref={container}>
      <button
        type="button"
        className="account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <AccountIcon />
        <span>{label}</span>
      </button>
      {open ? (
        <div className="account-menu" role="menu">
          <div className="account-menu-profile">
            <strong>{user.username ? `@${user.username}` : user.name}</strong>
            <span>{user.email}</span>
            {user.role === "admin" ? <small>administrator</small> : null}
          </div>
          {user.role === "admin" ? (
            <>
              <Link role="menuitem" to="/thoughts" onClick={() => setOpen(false)}>
                new thought
              </Link>
              <Link role="menuitem" to="/write" onClick={() => setOpen(false)}>
                new post
              </Link>
            </>
          ) : null}
          <button type="button" role="menuitem" onClick={() => void signOut()}>
            sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
