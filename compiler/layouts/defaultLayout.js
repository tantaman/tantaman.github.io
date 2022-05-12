import { select } from 'hast-util-select';
import { h } from 'hastscript';

export default function defaultLayout(tree, file) {
  // TODO: you could probably wire up some jsx compilation to create the
  // hastscript
  const body = select('body', tree);
  const newChildren = [body.children];
  if (file.data.matter.title) {
    newChildren.unshift(h('h1', file.data.matter.title));
  }
  body.children = [
    h('header#header', [h('img.logo', { src: '/img/avatar-icon.png' })]),
    h('#static-container', [
      h('#before-static'),
      h('main#static', newChildren),
      h('#after-static'),
    ]),
    h('footer#footer'),
  ];
}
