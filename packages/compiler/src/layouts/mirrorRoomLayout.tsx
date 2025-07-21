// @ts-nocheck -- jsx hastscript types don't work with hast??
import { select } from 'hast-util-select';
import { h } from 'hastscript';
import { VFile } from 'vfile';
import layout from './layouts';

export default function defaultLayout(tree: ReturnType<typeof h>, file: VFile) {
  const html = select('html', tree);
  html?.children = [
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>The Mirror Room</title>
      <link
        href="https://fonts.googleapis.com/css2?family=IM+Fell+English&family=Crimson+Pro&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/the-mirror-room/styles.css" />
    </head>,
    <body>
      <div class="container">
        <header>
          <h1>The Mirror Room</h1>
          <h2>A Short Story</h2>
        </header>

        <section class="chapter">
          <h3>The Meeting</h3>
          <p>
            Daniel sat in the coffee shop, staring at his reflection in the
            black screen of his laptop.
          </p>
          <p>
            Six months ago, he’d been unshakeable—the Consistent Man, people
            called him. The terror of seeing beyond principles simultaneously
            without distress—it all challenged his carefully constructed
            worldview. Then came the philosophy books, the late-night
            conversations with intellectuals who dismantled his certainties with
            gentle questions.
          </p>
          <p>Daniel felt like he was dissolving.</p>
        </section>

        <blockquote>
          <p>
            <em>
              You are not problems to be solved. You are not puzzles to be
              figured out. You are the very means by which the Purposeless
              Purpose fulfills Itself.
            </em>
          </p>
        </blockquote>

        <footer>
          <p>© The Mirror Room — All Rights Reserved.</p>
        </footer>
      </div>
    </body>,
  ];
}
