# tantaman-api

Remote MCP server for [tantaman.com](https://tantaman.com) that lets visitors search the blog using their own Claude account. Runs on Cloudflare Workers with vector similarity search over pre-computed embeddings.

Also exposes a thoughts API — ephemeral micro-posts with file attachments, stored in Cloudflare D1 and R2, protected by a bearer token.

## How it works

1. A build script chunks all blog posts and generates vector embeddings via Cloudflare Workers AI
2. Embeddings are upserted into the shared Cloudflare Vectorize index (`thought-embeddings`) under a `blog-` ID prefix
3. A Cloudflare Worker exposes an MCP server with a `search_blog` tool that queries Vectorize
4. Visitors connect the MCP server to Claude Desktop or claude.ai and ask questions about the blog
5. Claude calls `search_blog`, retrieves relevant passages, and synthesizes answers with citations
6. A D1-backed thoughts API with R2-powered file attachments allows posting and reading ephemeral micro-posts, authenticated via bearer token

Zero LLM cost for the site owner — visitors use their own Claude subscription.

## Prerequisites

- Node.js >= 17
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is sufficient)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/): `npm install -g wrangler`
- A Cloudflare API token with Workers AI permissions

## Setup

### 1. Generate and upload embeddings

The script embeds blog chunks via Workers AI and upserts them directly into the
Vectorize index named in `wrangler.toml` (`thought-embeddings`). The same index
also holds thought, paste, and amplification vectors — they're distinguished by
ID prefix.

From the repo root:

```sh
# Set credentials (token needs Workers AI + Vectorize edit perms)
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"

# Dry run to verify content discovery
node scripts/generate-embeddings.mjs --dry-run

# Embed and upsert into Vectorize
node scripts/generate-embeddings.mjs
```

A cache file `.chat-embeddings-cache.json` tracks `{hash, chunkCount}` per post
so subsequent runs only re-embed changed posts and clean up orphaned chunks.

### 2. Install dependencies and deploy

```sh
cd worker
npm install
npx wrangler deploy
```

The MCP server will be available at `https://tantaman-api.<your-subdomain>.workers.dev/mcp`.

## Local development

```sh
cd worker
npm install
npx wrangler dev
```

The local dev server runs at `http://localhost:8787`. Note: Workers AI and KV bindings require `wrangler dev --remote` to work.

## Updating after new posts

From the repo root:

```sh
node scripts/generate-embeddings.mjs
```

The cache ensures only new or changed posts are re-embedded; deleted posts have
their chunks removed from Vectorize automatically.

## Connecting as a visitor

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tantaman-blog": {
      "url": "https://tantamanlands.tantaman.workers.dev/mcp"
    }
  }
}
```

### Claude.ai

Add as a remote MCP integration in Settings (available on Pro/Max/Team/Enterprise plans).

## Thoughts API

Ephemeral micro-posts stored in Cloudflare D1 (SQLite). `POST` requires a bearer token; `GET` is public.

### 1. Create the D1 database

```sh
cd worker
wrangler d1 create thought
```

Copy the `database_id` from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "thought"
database_id = "your-database-id-here"
```

### 2. Create the R2 bucket

```sh
wrangler r2 bucket create thought-attachments
```

Update `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "thought-attachments"
```

### 3. Run migrations

```sh
# Locally (for dev)
wrangler d1 migrations apply thought --local

# Remote (for production)
wrangler d1 migrations apply thought --remote
```

### 4. Set the secret

Set the bearer token used to authenticate `POST /thoughts`. Secrets are stored encrypted and injected at runtime — do not put the real value in `wrangler.toml`.

```sh
wrangler secret put THOUGHT_SECRET
```

### 5. Deploy

```sh
npx wrangler deploy
```

### Verifying the setup

```sh
# Fetch thoughts (public)
curl https://tantamanlands.tantaman.workers.dev/thoughts
# → 200 with { thoughts: [], meta: { ... } }

# Post a thought (requires secret)
curl -X POST https://tantamanlands.tantaman.workers.dev/thoughts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-secret>" \
  -d '{"body": "hello world"}'
# → 201 with { id, body, timestamp, created_at }

# Post a thought with file attachments (multipart/form-data)
curl -X POST https://tantamanlands.tantaman.workers.dev/thoughts \
  -H "Authorization: Bearer <your-secret>" \
  -F "body=hello with an image" \
  -F "file=@photo.jpg"
# → 201 with { id, body, timestamp, created_at, attachments: [...] }
```

## Cost

Everything runs within Cloudflare's free tier:
- **Workers**: 100K requests/day
- **KV**: 100K reads/day, 1GB storage
- **Vectorize**: 30M queried vector dimensions/month, 5M stored dimensions
- **Workers AI**: Free tier for `bge-base-en-v1.5` embeddings
- **D1**: 5M rows read/day, 100K rows written/day, 5GB storage
- **R2**: 10GB storage, 10M Class A ops/month, 10M Class B ops/month
