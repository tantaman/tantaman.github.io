import { toHtml } from 'hast-util-to-html';
import { h } from 'hastscript';

// TODO: put this thru the unified pipeline like markdown?
export default function index(file, cwd, files) {
  return {
    content: (index) => {
      return toHtml(
        h('html', [
          h('head', h('link', { rel: 'stylesheet', href: '/index.css' })),
          h('body', [
            h('header#header', [
              h('img.logo', { src: '/img/avatar-icon.png' }),
            ]),
            h('ol', [
              Object.entries(index)
                .filter(([key, meta]) => key !== 'index.js')
                .map(([key, meta]) =>
                  h('li', h('a', { href: meta.compiledFilename }, key)),
                ),
            ]),
          ]),
        ]),
      );
    },
    frontmatter: {},
    greymatter: {},
  };
}
