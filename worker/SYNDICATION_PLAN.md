# Syndicate Thoughts to Bluesky + X/Twitter

## Context

The worker at `worker/src/index.ts` has a `POST /thoughts` endpoint that stores short posts (max 1000 chars) in D1. The goal is to automatically cross-post each thought to Bluesky and X/Twitter when it's created, without blocking the HTTP response.

## Architecture

- Syndication runs async via `c.executionCtx.waitUntil()` — thought creation always succeeds even if syndication fails
- Both platforms are called in parallel via `Promise.allSettled()`
- Errors are logged and stored in D1, not surfaced to the caller
- No new npm dependencies — uses Web Crypto API (HMAC-SHA1 for Twitter OAuth) and `Intl.Segmenter` (grapheme counting for Bluesky), both built into the Workers runtime

## Files to Create/Modify

### New files
- `worker/migrations/0002_add-syndication-columns.sql` — adds `bluesky_uri`, `twitter_id`, `syndication_errors` columns to `thought` table
- `worker/src/syndication/truncate.ts` — text truncation (Bluesky: 300 graphemes, X: 280 chars). If too long, truncate at word boundary + append `… https://tantaman.com/thoughts.html`
- `worker/src/syndication/bluesky.ts` — AT Protocol client: session management (cached in `EMBEDDINGS` KV with `bsky:` prefix to avoid CF Worker IP rate limits on `createSession`), URL facet extraction (UTF-8 byte offsets), post creation with retry on 401
- `worker/src/syndication/twitter.ts` — OAuth 1.0a signing (HMAC-SHA1 via Web Crypto) + `POST /2/tweets`. Note: JSON body params are NOT included in OAuth signature base string
- `worker/src/syndication/index.ts` — orchestrator: calls both platforms in parallel, writes results back to D1

### Modified files
- `worker/src/index.ts` — add env vars to `Env` interface, accept optional `syndicate` boolean in POST body (default `true`), call `waitUntil(syndicateThought(...))` after insert

## New Environment Secrets (set via `wrangler secret put`)

| Secret | Purpose |
|---|---|
| `BLUESKY_HANDLE` | e.g., `you.bsky.social` |
| `BLUESKY_APP_PASSWORD` | App password from Bluesky settings |
| `X_API_KEY` | Twitter OAuth 1.0a consumer key |
| `X_API_SECRET` | Twitter OAuth 1.0a consumer secret |
| `X_ACCESS_TOKEN` | Twitter OAuth 1.0a access token (long-lived) |
| `X_ACCESS_TOKEN_SECRET` | Twitter OAuth 1.0a access token secret |

## Implementation Order

1. Create DB migration (`0002_add-syndication-columns.sql`)
2. Create `syndication/truncate.ts`
3. Create `syndication/bluesky.ts`
4. Create `syndication/twitter.ts`
5. Create `syndication/index.ts` (orchestrator)
6. Update `worker/src/index.ts` (Env interface, POST handler changes)

## Key Design Decisions

- **Bluesky session caching**: Reuse the existing `EMBEDDINGS` KV namespace with `bsky:session` key prefix (1-hour TTL). This avoids adding a new KV binding and works around the known Cloudflare IP rate-limiting issue on `createSession`.
- **Truncation**: Posts exceeding platform limits are truncated at a word boundary with `… <link>`. The link points to the thoughts page since individual thoughts don't have permalinks.
- **Opt-out**: `POST /thoughts` accepts `{ body, syndicate?: boolean }` — pass `syndicate: false` to skip cross-posting.
- **No retries beyond auth refresh**: A Bluesky 401 triggers one token refresh + retry. All other failures are logged and stored. A cron-based retry mechanism could be added later but is out of scope.

## Verification

1. Apply migration locally: `wrangler d1 migrations apply thought --local`
2. Run `wrangler dev` and test:
   - `POST /thoughts` with a short body — verify thought created and syndication columns updated
   - `POST /thoughts` with `syndicate: false` — verify syndication columns remain null
   - `POST /thoughts` with a 500-char body — verify truncation works correctly
3. Check Workers logs (`wrangler tail`) for any syndication errors
4. After setting secrets, deploy with `wrangler deploy` and `wrangler d1 migrations apply thought --remote`
