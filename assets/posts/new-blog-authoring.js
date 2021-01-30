import {publisher, atom} from '/assets/js/publisher.js';

const {md} = publisher(document.getElementById('doc'));
const consts_and_vars = atom({
  pi: Math.PI,
  variable: 'Variable',
  angle: 0,
});

md(`
Welcome friends!

To the wonderful new way to write javascript powered blog posts.

Do you write blog posts that contain interactive demos? Did you wish that there was
an easier way to push updates from Javascript into your Markdown text?
`);

md((state) => `
Maybe you're writing a paper that refers to some constant \`(${state.pi})\` that will be
repeated \`(${state.pi})\` numerous \`(${state.pi})\` times \`(${state.pi})\`.

Or maybe you have a fluctuating
(\`${Math.sin(state.angle * (Math.PI / 180.0)).toFixed(2)}\`)
**${state.variable}**
(\`${Math.sin(state.angle * (Math.PI / 180.0)).toFixed(2)}\`)
to which you'd like to refer in the text of the post.
`, consts_and_vars);

md(`
Or even generate tables and arbitrary HTML!
`);

html(/*html*/`
<div class="coin_chart">
  ${render_coins()}
</div>
`);

function move_letter(l, word) {
  const i = word.indexOf(l);

  if (i === word.length - 1) {
    return l + word.substr(0, word.length - 1);
  }

  return word.substr(0, i) + word.substr(i + 1, 1) + l + word.substr(i + 2);
}

setInterval(
  () =>
    consts_and_vars.merge({
      variable: move_letter('V', consts_and_vars.get().variable),
      angle: (consts_and_vars.get().angle + 30) % 360,
    }),
  250,
);

function coin_flip_table() {

}
