---
layout: post
title: "Reactive Markdown"
categories: blog authoring jsmd
jsmodules:
  - /assets/posts/reactive-markdown.js
---

Many of my blog posts contain interactive demos or content that is generated via `JavaScript`. However, the prose of my blog posts is written in Markdown. Shuttling data back and forth from the markdown side to the JS side can be annoying, especially when data from `JavaScript` needs to be displayed inline with the markdown and updated in real time.

I've experimented with a few ways. One which uses a `data-bind` attribute to bind an element to a JS variable. This was the approach I took in my [Gambler's fallacy post](/2021-01-26-regression-mean-vs-gambler/).

## Data-Bind Example

[js](https://github.com/tantaman/tantaman.github.io/blob/e11824ea7415f15a765d71aeedfdf6a688bffb75/assets/posts/regression-mean-vs-gambler.js#L168-L202)
```
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
bindit(exported_data);
```

[markdown](https://raw.githubusercontent.com/tantaman/tantaman.github.io/master/_posts/2021-01-26-regression-mean-vs-gambler.markdown)
```
If <i data-bind="run_length"></i> coin tosses produced <i data-bind="run_length"></i> heads,
the next <i data-bind="run_length"></i> ...
```

My latest iteration, however, is "reactive markdown."

## Reactive Markdown

<div id="doc"></div>
