// @ts-nocheck

import { select } from 'hast-util-select';
import { h } from 'hastscript';
import { VFile } from 'vfile';

export default function defaultLayout(tree: ReturnType<typeof h>, file: VFile) {
  // TODO: you could probably wire up some jsx compilation to create the
  // hastscript
  const body = select('body', tree);
  if (!body) {
    throw new Error(
      'Body is required to exist before applying the default layout',
    );
  }
  const newChildren = [body.children];
  const matter = file.data.matter as any;
  if (matter?.title) {
    newChildren.unshift(<h1>{matter?.title}</h1>);
  }
  body.children = [
    <header id="header">
      <img class="logo" src="/img/avatar-icon.png" />
    </header>,
    <div id="static-container">
      <div id="before-static"></div>
      <main id="static">{newChildren}</main>
      <div id="after-static"></div>
    </div>,
    <footer id="footer"></footer>,
  ];
}
