import {
  doc,
  meta,
  layout,
  rehypeDocument,
  indexFrontmatter,
  contentDirs,
} from '@tantaman/sitecompiler';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import rehypeMeta from 'rehype-meta';
import rehypeParse from 'rehype-parse';
import { renderCollection } from './index.js';

export default async function stories(file, cwd, files) {
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
        .process(await storiesPage());

      return result.toString();
    },
    frontmatter: {
      title: 'Stories',
      description: 'All stories from The Mirror Room',
    },
    greymatter: {},
    dependencies: [...contentDirs()],
  };
}

async function storiesPage() {
  const indices = await indexFrontmatter();
  const storiesIndex = indices['the-mirror-room/'];

  return renderCollection('the-mirror-room/', storiesIndex);
}
