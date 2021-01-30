import {publisher, atom} from '/assets/js/publisher.js';

const p = publisher(document.getElementById('doc'));

const state = atom(1);
p.md(
(state) =>
/* md */`
# Hello!
there world!

${state}
`,
state,
);

setInterval(
  () => state.set(state.get() + 1),
  500,
);
