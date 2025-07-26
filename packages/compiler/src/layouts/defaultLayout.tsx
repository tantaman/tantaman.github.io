// @ts-nocheck -- jsx hastscript types don't work with hast??
import { select } from 'hast-util-select';
import { h } from 'hastscript';
import { VFile } from 'vfile';

export default function defaultLayout(tree: ReturnType<typeof h>, file: VFile) {
  const body = select('body', tree);
  if (!body) {
    throw new Error(
      'Body is required to exist before applying the default layout',
    );
  }
  const newChildren = [body.children];
  const matter = file.data.matter;
  const maybeDate = file.basename?.substring(0, 10);
  if (/[0-9]{4}-[0-9]{2}-[0-9]{2}/.exec(maybeDate)) {
    newChildren.unshift(
      <span class="published subtext">Published {maybeDate}</span>,
    );
  }
  if (matter?.title) {
    newChildren.unshift(<h1>{matter?.title}</h1>);
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
          <a href="/#notes">Notes</a>
          <a href="/#synthesis">Synthesis</a>
          <a href="/#about">About</a>
        </nav>
      </div>
    </header>,
    <main id="static">{newChildren}</main>,
    <footer id="footer"></footer>,
  ];
}
