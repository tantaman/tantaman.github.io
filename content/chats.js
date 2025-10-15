import {
  doc,
  meta,
  layout,
  rehypeDocument,
  indexFrontmatter,
} from '@tantaman/sitecompiler';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import rehypeMeta from 'rehype-meta';
import rehypeParse from 'rehype-parse';
import { renderCollection } from './index.js';

export default async function chats(file, cwd, files) {
  return {
    content: async () => {
      const result = await unified()
        .use(rehypeParse)
        .use(rehypeDocument, {
          ...doc,
          css: doc.css.concat(['/home.css']),
          js: doc.js.concat(['/home.js']),
        })
        .use(rehypeMeta, meta)
        .use(layout)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(await chatsPage());

      return result.toString();
    },
    frontmatter: {
      title: 'Chats',
      description: 'All chat conversations',
    },
    greymatter: {},
  };
}

async function chatsPage() {
  const indices = await indexFrontmatter();
  const chatsIndex = indices['chats/'];

  return renderCollection('chats/', chatsIndex);
}
