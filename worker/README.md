# tantaman-api

Remote MCP server for [tantaman.com](https://tantaman.com) that lets visitors search the blog using their own Claude account. Runs on Cloudflare Workers with vector similarity search over pre-computed embeddings.

Also accepts incoming WhatsApp messages from allowlisted phone numbers and stores them in a D1 database for ephemeral note-taking on the go.

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
wrangler kv key put --namespace-id=<your-namespace-id> "embeddings:all" --path=../.chat-embeddings.json --remote
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
      "url": "https://tantamanlands.tantaman.workers.dev/mcp"
    }
  }
}
```

### Claude.ai

Add as a remote MCP integration in Settings (available on Pro/Max/Team/Enterprise plans).

## WhatsApp Message Ingestion

Receive-only WhatsApp integration. Messages from allowlisted numbers are stored in Cloudflare D1 (SQLite). Meta's webhook retries are handled idempotently via `INSERT OR IGNORE` on the WhatsApp message ID.

### 1. Create the D1 database

```sh
cd worker
wrangler d1 create whatsapp-messages
```

Copy the `database_id` from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "whatsapp-messages"
database_id = "your-database-id-here"
```

### 2. Run migrations

```sh
# Locally (for dev)
wrangler d1 migrations apply whatsapp-messages --local

# Remote (for production)
wrangler d1 migrations apply whatsapp-messages --remote
```

### 3. Configure allowed senders

Update `wrangler.toml` with the phone numbers that are allowed to send messages. Numbers should be without the `+` prefix to match WhatsApp's format (e.g., `15551234567`):

```toml
[vars]
ALLOWED_SENDERS = "15551234567,15559876543"
```

### 4. Set the webhook verify token

Choose a secret string and set it as a Cloudflare secret:

```sh
wrangler secret put WHATSAPP_VERIFY_TOKEN
```

### 5. Deploy

```sh
npx wrangler deploy
```

### 6. Meta Business / WhatsApp setup

1. Create a Meta Business account at [business.facebook.com](https://business.facebook.com)
2. Create a developer app at [developers.facebook.com/apps](https://developers.facebook.com/apps) with type "Business"
3. Add the **WhatsApp** product to the app
4. Meta provisions a test phone number automatically
5. Go to **WhatsApp > Configuration** in the app dashboard:
   - Set the callback URL to `https://tantamanlands.tantaman.workers.dev/webhook`
   - Enter the same verify token you set in step 4
   - Subscribe to the **messages** webhook field
6. No app review is needed for testing with your own numbers (up to 5 recipients in dev mode)

### Verifying the setup

```sh
# Test the verification handshake
curl "https://tantamanlands.tantaman.workers.dev/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
# Should return: test123

# Test message ingestion locally
curl -X POST http://localhost:8787/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "15551234567",
            "id": "wamid.test",
            "timestamp": "1700000000",
            "type": "text",
            "text": {"body": "test thought"}
          }]
        }
      }]
    }]
  }'

# Check stored messages locally
wrangler d1 execute whatsapp-messages --local --command "SELECT * FROM messages"
```

## Cost

Everything runs within Cloudflare's free tier:
- **Workers**: 100K requests/day
- **KV**: 100K reads/day, 1GB storage
- **Workers AI**: Free tier for `bge-base-en-v1.5` embeddings
- **D1**: 5M rows read/day, 100K rows written/day, 5GB storage
