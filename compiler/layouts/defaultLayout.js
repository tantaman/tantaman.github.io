import { select } from 'hast-util-select';
import { h } from 'hastscript';

export default function defaultLayout(tree, file) {
  // TODO: you could probably wire up some jsx compilation to create the
  // hastscript
  const body = select('body', tree);
  body.children = [
    h('header#header'),
    h('#static-container', [
      h('#before-static'),
      h('main#static', [body.children]),
      h('#after-static'),
    ]),
    h('footer#footer'),
  ];
}
