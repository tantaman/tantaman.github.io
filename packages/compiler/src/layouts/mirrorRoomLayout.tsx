// @ts-nocheck -- jsx hastscript types don't work with hast??
import { select } from 'hast-util-select';
import { h } from 'hastscript';
import { VFile } from 'vfile';
import layout from './layouts';

export default function defaultLayout(tree: ReturnType<typeof h>, file: VFile) {
  const html = select('html', tree);
  const body = select('body', tree);
  if (!body) {
    throw new Error(
      'Body is required to exist before applying the default layout',
    );
  }
  const oldChildren = body.children;
  html?.children = [
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      <title>The Mirror Room – A Short Story Collection</title>
      <meta name="title" content="The Mirror Room – A Short Story Collection" />
      <meta
        name="description"
        content="A short story collection exploring identity, crisis, freedom, and becoming."
      />

      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://tantaman.com/the-mirror-room/" />
      <meta
        property="og:title"
        content="The Mirror Room – A Short Story Collection"
      />
      <meta
        property="og:description"
        content="A short story collection exploring identity, crisis, freedom, and becoming."
      />
      <meta
        property="og:image"
        content="https://tantaman.com/the-mirror-room/cover.png"
      />

      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:url"
        content="https://tantaman.com/the-mirror-room/"
      />
      <meta
        name="twitter:title"
        content="The Mirror Room – A Short Story Collection"
      />
      <meta
        name="twitter:description"
        content="A short story collection exploring identity, crisis, freedom, and becoming."
      />
      <meta
        name="twitter:image"
        content="https://tantaman.com/the-mirror-room/cover.png"
      />

      <link rel="stylesheet" href="/the-mirror-room/styles.css" />
    </head>,
    <body>
      <div class="container">{oldChildren}</div>
    </body>,
  ];
}

/*
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
*/
