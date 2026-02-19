---
title: MCP
description: Connect to this blog's MCP server
minimalHeader: true
---

This site has an [MCP](https://modelcontextprotocol.io/) server that lets you search the blog from any MCP-compatible AI client.

**Endpoint:** `https://tantamanlands.tantaman.workers.dev/mcp`

## Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tantaman-blog": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://tantamanlands.tantaman.workers.dev/mcp"
      ]
    }
  }
}
```

## Claude.ai

Go to **Settings > Integrations > Add remote MCP server** and enter the endpoint URL above.

## Other Clients

Any MCP-compatible client can connect using the endpoint URL. The server exposes a `search_blog` tool that returns relevant passages from blog posts.
