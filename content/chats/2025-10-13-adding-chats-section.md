---
title: "Adding a Chats Section to My Blog"
description: "A conversation with Claude about setting up a new section to document interesting LLM chats"
tags: ["software", "ai"]
concern: [craft]
---

This is a sample chat post demonstrating the new chats section. This section is designed to document interesting conversations with LLMs.

## The Setup

The chats section was added by:
1. Creating a `./content/chats/` directory
2. Adding `'chats/'` to the collections array in `packages/compiler/src/collections.ts`
3. Updating the `renderCollection()` function in `content/index.js` to handle the chats collection

## Next Steps

Now you can add markdown files to the `./content/chats/` directory to document your conversations with LLMs. Each file should follow the standard naming convention: `YYYY-MM-DD-title.md` for proper sorting and display.
