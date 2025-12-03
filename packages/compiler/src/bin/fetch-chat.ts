#!/usr/bin/env node

import { chromium } from 'playwright';
import { writeFileSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ParsedConversation {
  title: string;
  messages: Message[];
}

async function fetchChatGPTConversation(url: string): Promise<ParsedConversation> {
  console.log(`Fetching conversation from: ${url}`);
  console.log('Launching browser...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to the page - use 'domcontentloaded' instead of 'networkidle' for more reliability
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the conversation to load
    console.log('Waiting for conversation to load...');
    await page.waitForSelector('article', { timeout: 15000 });

    // Extract title from page title
    const title = await page.title();
    const cleanTitle = title.replace('ChatGPT - ', '').replace(' - ChatGPT', '').trim() || 'Untitled Chat';

    console.log(`Found title: ${cleanTitle}`);
    console.log('Extracting messages...');

    // Extract all conversation messages
    const messages: Message[] = await page.evaluate(() => {
      const results: Message[] = [];
      const articles = document.querySelectorAll('article');

      articles.forEach((article) => {
        // Find the message container with the role attribute
        const messageDiv = article.querySelector('[data-message-author-role]');
        const dataRole = messageDiv?.getAttribute('data-message-author-role');

        let role: 'user' | 'assistant' = 'user';
        let text = '';

        if (dataRole === 'assistant' || dataRole === 'system') {
          role = 'assistant';
          // Assistant messages have formatted content in .markdown.prose
          const contentEl = article.querySelector('.markdown.prose');
          text = contentEl?.innerHTML?.trim() || '';
        } else if (dataRole === 'user') {
          role = 'user';
          // User messages are in .whitespace-pre-wrap
          const contentEl = article.querySelector('.whitespace-pre-wrap');
          text = contentEl?.innerHTML?.trim() || '';
        } else {
          // Fallback: try to find content in either location
          const assistantContent = article.querySelector('.markdown.prose');
          const userContent = article.querySelector('.whitespace-pre-wrap');

          if (assistantContent) {
            role = 'assistant';
            text = assistantContent.innerHTML?.trim() || '';
          } else if (userContent) {
            role = 'user';
            text = userContent.innerHTML?.trim() || '';
          } else {
            // Last resort: use article text content
            text = article.textContent?.trim() || '';
            role = results.length % 2 === 0 ? 'user' : 'assistant';
          }
        }

        if (!text) return;

        results.push({ role, content: text });
      });

      return results;
    });

    await browser.close();

    console.log(`Found ${messages.length} messages`);

    return { title: cleanTitle, messages };

  } catch (error) {
    await browser.close();
    throw error;
  }
}

function generateMarkdown(conversation: ParsedConversation, sourceUrl: string, customTitle?: string, tags?: string[]): string {
  const title = customTitle || conversation.title;
  const date = new Date().toISOString().split('T')[0];

  // Get description and clean it for YAML (strip HTML, remove newlines, escape quotes)
  let description = conversation.messages[0]?.content || 'A conversation with ChatGPT';
  description = description
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/"/g, '\\"')  // Escape quotes
    .trim()
    .substring(0, 150);

  const tagList = tags || ['chatgpt', 'llm'];

  let markdown = '---\n';
  markdown += `title: "${title}"\n`;
  markdown += `layout: "chat"\n`;
  markdown += `source: "${sourceUrl}"\n`;
  markdown += `description: "${description}"\n`;
  markdown += `tags: [${tagList.map(t => `"${t}"`).join(', ')}]\n`;
  markdown += '---\n\n';

  conversation.messages.forEach((msg, index) => {
    markdown += msg.content;
    // Add spacing between messages
    if (index < conversation.messages.length - 1) {
      markdown += '\n\n---\n\n';
    }
  });

  return markdown;
}

function findExistingChatFile(outputDir: string, sourceUrl: string, cwd: string): string | null {
  try {
    const fullOutputDir = join(cwd, outputDir);
    const files = readdirSync(fullOutputDir);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filepath = join(fullOutputDir, file);
      const content = readFileSync(filepath, 'utf-8');

      // Extract frontmatter source URL
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const sourceMatch = frontmatter.match(/source:\s*"([^"]+)"/);
        if (sourceMatch && sourceMatch[1] === sourceUrl) {
          return filepath;
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist or other error - return null
  }

  return null;
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

Note: This tool uses Playwright to render the JavaScript-heavy ChatGPT share pages.
      On first run, you may need to install browser binaries with: pnpm playwright install chromium
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
    const cwd = process.cwd();

    // Check if this URL has already been fetched
    const existingFile = findExistingChatFile(outputDir, url, cwd);

    const conversation = await fetchChatGPTConversation(url);

    if (conversation.messages.length === 0) {
      console.error('\n❌ Error: No messages found in conversation.');
      console.error('The ChatGPT HTML structure may have changed.');
      console.error('Try running: pnpm playwright install chromium');
      process.exit(1);
    }

    const markdown = generateMarkdown(conversation, url, customTitle, tags);

    let filepath: string;

    if (existingFile) {
      // Update existing file
      filepath = existingFile;
      writeFileSync(filepath, markdown);
      console.log(`\n✓ Updated existing chat: ${filepath}`);
    } else {
      // Create new file
      const title = customTitle || conversation.title;
      const date = new Date().toISOString().split('T')[0];
      const slug = slugify(title);
      const filename = `${date}-${slug}.md`;
      filepath = join(cwd, outputDir, filename);
      writeFileSync(filepath, markdown);
      console.log(`\n✓ Successfully created: ${filepath}`);
    }

    const title = customTitle || conversation.title;
    console.log(`  Title: ${title}`);
    console.log(`  Messages: ${conversation.messages.length}`);
    console.log(`\nRun 'pnpm build' to compile the new chat post.`);

  } catch (error) {
    console.error('\n❌ Error fetching conversation:');
    if (error instanceof Error) {
      console.error(error.message);
      if (error.message.includes('browserType.launch') || error.message.includes('Executable doesn\'t exist')) {
        console.error('\nPlaywright browsers not installed. Run:');
        console.error('  pnpm playwright install chromium');
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
