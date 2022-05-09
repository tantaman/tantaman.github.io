import { publisher, atom } from '../static/blog-assets/publisher';

{
  const { md, html } = publisher(document.getElementById('simplified-example'));

  const state = atom(0);
  md((x) => `# the count is ${x}`, state);

  setInterval(() => state.set(state.get() + 1), 500);
}

function the_post() {
  // Select the root element to inject our document
  const { md } = publisher(document.getElementById('doc'));

  // Variables used by the markdown doc are stored in "atoms"
  const consts_and_vars = atom({
    pi: Math.PI,
    variable: 'Variable',
    angle: 0,
  });

  // Start writing Markdown.
  // We can refer to JS vars with ${}
  md(
    (state) => `
# Welcome friends!

The rest of this post is written in Reactive Markdown! Reactive Markdown is a
way to write Markdown docs that react to changes in the data that they display.

Maybe you're writing a paper that refers to some constant \`(${
      state.pi
    })\` that will be
repeated \`(${state.pi})\` numerous \`(${state.pi})\` times \`(${state.pi})\`.

Or maybe you have a fluctuating
(\`${Math.sin(state.angle * (Math.PI / 180.0)).toFixed(2)}\`)
**${state.variable}**
(\`${Math.sin(state.angle * (Math.PI / 180.0)).toFixed(2)}\`)
to which you'd like to refer in the text of the post.
`,
    // Pass in the state that the Markdown doc depends upon
    consts_and_vars,
  );

  // Kick off a timer to update the data used by the doc
  setInterval(
    () =>
      // updated our atom with the new state that the Markdown doc should show
      consts_and_vars.merge({
        variable: move_letter('V', consts_and_vars.get().variable),
        angle: (consts_and_vars.get().angle + 30) % 360,
      }),
    250,
  );

  // Show our users the source of the post.
  // Here we can see an obvious problem of being JS-first
  md(
    `**How does it work?** See the \`reactive.markdown\` source of the above post:
\`\`\`js
${the_post.toString()}
\`\`\`
`,
  );
}

the_post();

const { md } = publisher(document.getElementById('doc'));
function more_complex() {
  md(
    `# Moar
We can do much more with \`Reactive.Markdown\` such as creating and re-using \`Markdown
components\` as well as generating complex views.

E.g.,

${bullet_list([1, 2, 3, 4])}

**Source:**
\`\`\`js
${more_complex.toString()}
\`\`\`
`,
  );

  // Markdown components can call one another, just like regular functions.
  function bullet_list(a) {
    return a.map((x) => `* ${bullet(x)}`).join('\n');
  }

  // A function that returns a markdown string is a "markdown component"
  function bullet(n) {
    const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
    return `This is the **${n}**${suffix} bullet.`;
  }
}

more_complex();

function move_letter(l, word) {
  const i = word.indexOf(l);

  if (i === word.length - 1) {
    return l + word.substr(0, word.length - 1);
  }

  return word.substr(0, i) + word.substr(i + 1, 1) + l + word.substr(i + 2);
}
