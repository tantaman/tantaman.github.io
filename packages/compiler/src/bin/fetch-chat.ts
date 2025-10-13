#!/usr/bin/env node

import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ParsedConversation {
  title: string;
  messages: Message[];
}

async function fetchChatGPTConversation(url: string): Promise<string> {
  console.log(`Fetching conversation from: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

function parseConversation(html: string): ParsedConversation {
  const $ = cheerio.load(html);

  // Try to find the title
  const title = $('title').text().replace(' - ChatGPT', '').trim() || 'Untitled Chat';

  const messages: Message[] = [];

  // ChatGPT's shared conversations have a specific structure
  // This is a best-effort parser that may need adjustment based on actual HTML structure

  // Look for conversation messages in the HTML
  // Common selectors for ChatGPT shared links (these may need adjustment):
  $('[data-testid^="conversation-turn-"]').each((_, element) => {
    const $el = $(element);
    const text = $el.text().trim();

    // Try to determine role based on structure
    const isUser = $el.find('[data-message-author-role="user"]').length > 0;
    const isAssistant = $el.find('[data-message-author-role="assistant"]').length > 0;

    if (text && (isUser || isAssistant)) {
      messages.push({
        role: isUser ? 'user' : 'assistant',
        content: text
      });
    }
  });

  // Fallback: Try alternative selectors if no messages found
  if (messages.length === 0) {
    $('.min-h-\\[20px\\]').each((_, element) => {
      const $el = $(element);
      const content = $el.text().trim();

      if (content) {
        // Alternate between user and assistant (starting with user)
        const role = messages.length % 2 === 0 ? 'user' : 'assistant';
        messages.push({ role, content });
      }
    });
  }

  return { title, messages };
}

function generateMarkdown(conversation: ParsedConversation, customTitle?: string, tags?: string[]): string {
  const title = customTitle || conversation.title;
  const date = new Date().toISOString().split('T')[0];
  const description = conversation.messages[0]?.content.substring(0, 150) || 'A conversation with ChatGPT';
  const tagList = tags || ['chatgpt', 'llm'];

  let markdown = '---\n';
  markdown += `title: "${title}"\n`;
  markdown += `description: "${description}"\n`;
  markdown += `tags: [${tagList.map(t => `"${t}"`).join(', ')}]\n`;
  markdown += '---\n\n';

  conversation.messages.forEach((msg) => {
    const header = msg.role === 'user' ? '## User' : '## Assistant';
    markdown += `${header}\n\n${msg.content}\n\n`;
  });

  return markdown;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: fetch-chat <url> [options]

Fetch a ChatGPT shared conversation and convert it to markdown.

Arguments:
  url                 ChatGPT share URL (e.g., https://chatgpt.com/share/...)

Options:
  --title <title>     Custom title for the conversation
  --tags <tag1,tag2>  Comma-separated list of tags
  --output <path>     Output directory (default: content/chats/)
  --help, -h          Show this help message

Examples:
  fetch-chat https://chatgpt.com/share/abc123
  fetch-chat https://chatgpt.com/share/abc123 --title "My Chat" --tags "ai,discussion"
`);
    process.exit(0);
  }

  const url = args[0];
  let customTitle: string | undefined;
  let tags: string[] | undefined;
  let outputDir = 'content/chats';

  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      customTitle = args[i + 1];
      i++;
    } else if (args[i] === '--tags' && args[i + 1]) {
      tags = args[i + 1].split(',').map(t => t.trim());
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputDir = args[i + 1];
      i++;
    }
  }

  try {
    const html = await fetchChatGPTConversation(url);
    const conversation = parseConversation(html);

    if (conversation.messages.length === 0) {
      console.error('Warning: No messages found in conversation. The HTML structure may have changed.');
      console.error('Consider using a browser automation tool like Playwright instead.');
      process.exit(1);
    }

    const markdown = generateMarkdown(conversation, customTitle, tags);

    const title = customTitle || conversation.title;
    const date = new Date().toISOString().split('T')[0];
    const slug = slugify(title);
    const filename = `${date}-${slug}.md`;
    const filepath = join(process.cwd(), outputDir, filename);

    writeFileSync(filepath, markdown);

    console.log(`\n✓ Successfully created: ${filepath}`);
    console.log(`  Title: ${title}`);
    console.log(`  Messages: ${conversation.messages.length}`);
    console.log(`\nRun 'pnpm build' to compile the new chat post.`);

  } catch (error) {
    console.error('Error fetching conversation:', error);
    process.exit(1);
  }
}

main();
