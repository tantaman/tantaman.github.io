# Auth and Cloudflare setup

The app now has two deliberately separate data planes:

- Rindle stores posts, thoughts, paste bodies/metadata, comments, and the other live content views.
  Its database token is server-only.
- Cloudflare D1 (`AUTH_DB`) stores Better Auth users, sessions, linked OAuth accounts, usernames, and
  roles. Auth migrations live in `migrations-auth/`; never put them in Rindle's `migrations/`.

Public readers do not receive a guest or anonymous identity. In production a Better Auth session is
created only after an explicit GitHub or Google sign-in. The private Node development runtime is the
one exception: it automatically creates and signs into `owner@tantaman.local` as `@tantaman` so the
authoring desk is immediately usable.

## Local development

1. Run `pnpm dev`. The first browser boot creates a local Better Auth owner and signs it in with an
   HttpOnly session cookie; open `/write` to create a post or use **Edit post** on an existing post.
2. To exercise OAuth locally as well, copy `.env.example` to `.env`, set a long random
   `BETTER_AUTH_SECRET`, your `TANTAMAN_OWNER_EMAIL`, and at least one OAuth provider pair. Register:
   - `http://localhost:3000/api/auth/callback/github`
   - `http://localhost:3000/api/auth/callback/google`
3. Better Auth uses `auth-local.db` and automatically applies the SQL from `migrations-auth/`; the
   Rindle topology and migrations are unchanged. Email/password auth and the development bootstrap
   both fail closed when `NODE_ENV=production` or the auth database is D1.

To exercise the actual Workers runtime and local D1 binding, copy `.dev.vars.example` to `.dev.vars`,
run `pnpm auth:migrate`, then run `pnpm preview:cf`.

## Production

Set these Worker secrets or dashboard variables before enabling sign-in:

```sh
wrangler secret put BETTER_AUTH_URL
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put TANTAMAN_OWNER_EMAIL
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
# and/or GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
wrangler secret put RINDLE_URL
wrangler secret put RINDLE_DATABASE_TOKEN
# optional: RINDLE_WS_URL
```

`BETTER_AUTH_URL` is the deployed HTTPS origin. Register the matching
`/api/auth/callback/github` and `/api/auth/callback/google` URLs with the providers.

The D1 binding omits `database_id`, so Wrangler can provision `rindle-site-auth` during the first
deploy. Then apply its schema and redeploy if the first deploy happened before the migration:

```sh
pnpm deploy
pnpm auth:migrate:remote
pnpm deploy
```

For an explicitly provisioned database, run `wrangler d1 create rindle-site-auth` and paste its ID
into `wrangler.jsonc` before applying the remote migration.

## Roles and the owner account

Every new account is a `reader`. The provider-verified account whose email exactly matches
`TANTAMAN_OWNER_EMAIL` (case-insensitive) is created as `admin` with username `tantaman`. Configure
that value before the owner's first sign-in. The username is case-insensitively unique, clients cannot
set either `username` or `role`, and the D1 schema prevents a reader from holding the reserved name.

Publishing is a server-only capability: `savePost` is registered through `sharedApiMutators`, and
both the mutation authorizer and its principal mapper call `requirePublisher` in `server/app-api.ts`.
The browser predicts the shared generator with its session subject; the authority re-runs it with the
independently verified subject. Comments and reactions can later use the verified reader subject
without copying account or session records into Rindle.
