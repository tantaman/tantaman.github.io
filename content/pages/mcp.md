---
title: MCP
description: Connect to this blog's MCP server
minimalHeader: true
---

This site has an [MCP](https://modelcontextprotocol.io/) server that lets you search and browse the blog from any MCP-compatible AI client.

**Endpoint:** `https://tantaman.com/api/mcp`

## Tools

### `search_blog`

Semantic search over blog post content. Returns the most relevant passages from blog posts matching your query, ranked by embedding similarity.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | yes | The search query or question |

### `search_thoughts`

Semantic search over short-form thoughts (microblog). Returns thoughts matching the query via embedding similarity.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | yes | The search query or question |
| `topK` | number (1–20) | no | Number of results to return (default 10) |

### `browse_posts`

Faceted browsing and filtering of posts by subject, concern, and form. Returns matching posts with facet counts. All parameters are optional — call with no filters to see everything.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subjects` | string[] | no | Filter by subject tags, e.g. `["software", "ai"]`. AND logic — posts must match all specified subjects. |
| `concerns` | string[] | no | Filter by concern tags, e.g. `["craft"]`. AND logic — posts must match all specified concerns. |
| `forms` | string[] | no | Filter by form, e.g. `["essay", "chat"]`. OR logic — posts can match any specified form. |

Available subjects: philosophy, politics, software, culture, religion, economics, fiction, history, ai, math

Available concerns: power, ground, modernity, self, knowledge, craft, systems

Available forms: essay, story, chat, interactive, meditation, prophecy

## Setup

### Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tantaman-blog": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://tantaman.com/api/mcp"
      ]
    }
  }
}
```

### Claude.ai

Go to **Settings > Integrations > Add remote MCP server** and enter the endpoint URL above.

### Other Clients

Any MCP-compatible client can connect using the endpoint URL.
