---
layout: post
title: "Reactive Markdown"
categories: blog authoring jsmd
jsmodules:
  - /assets/posts/reactive-markdown.js
---

Many of my blog posts contain interactive demos or content that is generated via `JavaScript`. The prose of my posts, however, is written in `Markdown`. Shuttling data back and forth from the `Markdown` side to the `JS` side can be annoying, especially when data from `JavaScript` needs to be displayed inline with the markdown and updated in real time.

I've experimented with a few ways. The guiding principle around these experiments is to do as much as possible with as little code as possible. One approach uses a `data-bind` attribute to bind an element to a JS variable. This was the approach I took in my [Gambler's fallacy post](/2021-01-26-regression-mean-vs-gambler/).

## Data-Bind Example

[JS](https://github.com/tantaman/tantaman.github.io/blob/e11824ea7415f15a765d71aeedfdf6a688bffb75/assets/posts/regression-mean-vs-gambler.js#L168-L202) - export some vars from JS & bind them to the doc
```
// export vars
const exported_data = {
  num_coins: NUM_COINS.toLocaleString(),
  coin_chart: coins.map(
    coin => render_coin(coin),
  ).join(''),
  run_chart: render_runs(coins),
  run_length: RUN_LENGTH,
  run_list: render_run_list(coins, run_list),
  after_run_heads,
  after_run_tails,
  num_runs: run_list.length,
  ...
};
// bind to doc
bindit(exported_data);
```

[markdown](https://raw.githubusercontent.com/tantaman/tantaman.github.io/master/_posts/2021-01-26-regression-mean-vs-gambler.markdown) - leave placeholders where exported variables will be injected
```
If <i data-bind="run_length"></i> coin tosses produced <i data-bind="run_length"></i> heads,
the next <i data-bind="run_length"></i> ...
```

(show elegance -- function bindit(exported_data) {
  const to_bind = document.querySelectorAll('[data-bind]');
  for (e of to_bind) {
    const x = e.dataset.bind;
    e.innerHTML = exported_data[x];
  }
})

The data-bind approach is super simple but:
1. It is a bit verbose to write out `<i data-bind="..."></i>` every time you want to refer to a variable.
2. The data being exported from `JS` has to be display ready. This can lead to a ton of exports if the same data is re-exported under many formats. I'd rather display-format the exported data in the `Markdown` doc, putting all display time concerns in one spot.

My latest iteration, however, is "reactive markdown." A non-goal of the reactive markdown project was to re-write or extend an existing Markdown parser. My conclusion, however, is that for optimal ergonomics I'll need to extend the Markdown language.

## Reactive Markdown

<div id="doc"></div>
