// @ts-nocheck -- jsx hastscript types don't work with hast??
import { select, selectAll } from 'hast-util-select';
import { h } from 'hastscript';
import { VFile } from 'vfile';
import { visit } from 'unist-util-visit';

export default function chatLayout(tree: ReturnType<typeof h>, file: VFile) {
  const body = select('body', tree);
  if (!body) {
    throw new Error(
      'Body is required to exist before applying the chat layout',
    );
  }

  // Wrap chat messages in styled containers
  // Look for content before and after <hr> elements
  const contentChildren = body.children;
  const wrappedMessages: any[] = [];
  let currentMessage: any[] = [];
  let messageIndex = 0;

  contentChildren.forEach((child: any) => {
    if (child.type === 'element' && child.tagName === 'hr') {
      // End current message and start new one
      if (currentMessage.length > 0) {
        const isUser = messageIndex % 2 === 0;
        wrappedMessages.push(
          <div class={isUser ? 'chat-message user-message' : 'chat-message assistant-message'}>
            <div class="message-content">
              {currentMessage}
            </div>
          </div>
        );
        currentMessage = [];
        messageIndex++;
      }
    } else {
      currentMessage.push(child);
    }
  });

  // Don't forget the last message
  if (currentMessage.length > 0) {
    const isUser = messageIndex % 2 === 0;
    wrappedMessages.push(
      <div class={isUser ? 'chat-message user-message' : 'chat-message assistant-message'}>
        <div class="message-content">
          {currentMessage}
        </div>
      </div>
    );
  }

  const matter = file.data.matter;
  const maybeDate = file.basename?.substring(0, 10);

  const headerElements = [];
  if (matter?.title) {
    headerElements.push(<h1>{matter?.title}</h1>);
  }
  if (/[0-9]{4}-[0-9]{2}-[0-9]{2}/.exec(maybeDate)) {
    headerElements.push(
      <span class="published subtext">Published {maybeDate}</span>,
    );
  }

  body.children = [
    <header>
      <div class="container">
        <h1>
          <a href="/">Tantaman</a>
        </h1>
        <nav>
          <a href="/#blog">Blog</a>
          <a href="/#stories">Stories</a>
          <a href="/#chats">Chats</a>
        </nav>
      </div>
    </header>,
    <main id="static" class="chat-container">
      <div class="chat-header">
        {headerElements}
      </div>
      <div class="chat-messages">
        {wrappedMessages}
      </div>
    </main>,
    <footer id="footer"></footer>,
  ];
}
