# tantaman-api

Remote MCP server for [tantaman.com](https://tantaman.com) that lets visitors search the blog using their own Claude account. Runs on Cloudflare Workers with vector similarity search over pre-computed embeddings.

## How it works

1. A build script chunks all blog posts and generates vector embeddings via Cloudflare Workers AI
2. Embeddings are uploaded to Cloudflare KV
3. A Cloudflare Worker exposes an MCP server with a `search_blog` tool
4. Visitors connect the MCP server to Claude Desktop or claude.ai and ask questions about the blog
5. Claude calls `search_blog`, retrieves relevant passages, and synthesizes answers with citations

Zero LLM cost for the site owner — visitors use their own Claude subscription.

## Prerequisites

- Node.js >= 17
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is sufficient)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/): `npm install -g wrangler`
- A Cloudflare API token with Workers AI permissions

## Setup

### 1. Generate embeddings

From the repo root:

```sh
# Set credentials
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"

# Dry run to verify content discovery
node scripts/generate-embeddings.mjs --dry-run

# Generate embeddings (calls Cloudflare Workers AI API)
node scripts/generate-embeddings.mjs
```

This produces `.chat-embeddings.json` at the repo root (~2MB). A cache file `.chat-embeddings-cache.json` tracks content hashes so subsequent runs only re-embed changed posts.

### 2. Create KV namespace

```sh
wrangler login
wrangler kv namespace create EMBEDDINGS
```

Copy the namespace ID from the output and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "EMBEDDINGS"
id = "your-namespace-id-here"
```

### 3. Upload embeddings to KV

```sh
wrangler kv key put --namespace-id=<your-namespace-id> "embeddings:all" --path=../.chat-embeddings.json
```

### 4. Install dependencies and deploy

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
wrangler kv key put --namespace-id=<your-namespace-id> "embeddings:all" --path=.chat-embeddings.json
```

The cache ensures only new or changed posts are re-embedded.

## Connecting as a visitor

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tantaman-blog": {
      "url": "https://tantaman-api.<subdomain>.workers.dev/mcp"
    }
  }
}
```

### Claude.ai

Add as a remote MCP integration in Settings (available on Pro/Max/Team/Enterprise plans).

## Cost

Everything runs within Cloudflare's free tier:
- **Workers**: 100K requests/day
- **KV**: 100K reads/day, 1GB storage
- **Workers AI**: Free tier for `bge-base-en-v1.5` embeddings
