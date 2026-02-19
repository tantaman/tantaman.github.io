# Meta / WhatsApp Cloud API Setup Guide

Receive-only WhatsApp integration using Cloudflare Workers + D1.

## 1. Meta Business Account

1. Go to [business.facebook.com](https://business.facebook.com) and create a Meta Business account (or use an existing one)

## 2. Developer App + WhatsApp Product

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and log in
2. Click **Create App**, choose app type **"Business"**
3. Name it, attach to your Meta Business account
4. On the app dashboard, find **WhatsApp** and click **Set Up** (Add Product > WhatsApp)
5. Meta automatically provisions a test phone number

## 3. Worker Deployment

Run all commands from the `worker/` directory:

```sh
# 1. Create the D1 database
wrangler d1 create whatsapp-messages
# Copy the database_id from output into wrangler.toml

# 2. Run migrations
wrangler d1 migrations apply whatsapp-messages --remote

# 3. Set the webhook verify token secret
wrangler secret put WHATSAPP_VERIFY_TOKEN
# Enter whatever secret string you want when prompted

# 4. Update ALLOWED_SENDERS in wrangler.toml with phone numbers (no + prefix)
#    e.g. ALLOWED_SENDERS = "15551234567,15559876543"

# 5. Deploy
npx wrangler deploy
```

### wrangler.toml additions

```toml
[[d1_databases]]
binding = "DB"
database_name = "whatsapp-messages"
database_id = "<from wrangler d1 create>"

[vars]
ALLOWED_SENDERS = "<your-number>,<other-number>"
```

## 4. Webhook Configuration

1. In the Meta app dashboard, go to **WhatsApp > Configuration**
2. Under **Webhook**, click **Edit**
3. Set **Callback URL** to: `https://tantamanlands.tantaman.workers.dev/webhook`
4. Set **Verify token** to the same string you used in `wrangler secret put`
5. Click **Verify and Save** -- Meta sends a GET to `/webhook` and expects the challenge back
6. After verification succeeds, click **Manage** next to Webhook fields
7. Subscribe to **messages**

## 5. Testing

### Verify the handshake

```sh
curl "https://tantamanlands.tantaman.workers.dev/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
# Should return: test123
```

### Test message ingestion (local)

```sh
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
```

### Check stored messages

```sh
# Local
wrangler d1 execute whatsapp-messages --local --command "SELECT * FROM messages"

# Remote
wrangler d1 execute whatsapp-messages --remote --command "SELECT * FROM messages"
```

### In-dashboard testing

Under **WhatsApp > API Setup**, use the sandbox to send a test message. You can add your own phone number as a recipient (up to 5 numbers in dev mode).

## 6. Important Notes

- **No app review needed** for dev/testing with your own numbers (up to 5 recipients in dev mode)
- **Phone format**: Numbers in `ALLOWED_SENDERS` should have no `+` prefix -- use country code + number, e.g. `15551234567`
- **Receive-only**: This integration only receives messages, it does not send replies. No permanent access token needed
- **Status webhooks**: Meta also sends delivery/read receipts; the code handles these gracefully by only processing entries with a `messages` array
- **Idempotent**: `wa_message_id UNIQUE` + `INSERT OR IGNORE` handles Meta's webhook retries
- **Fast response**: POST `/webhook` returns 200 immediately; processing happens via `waitUntil()`
