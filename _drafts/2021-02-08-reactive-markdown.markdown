---
layout: post
title: "Reactive Markdown"
categories: blog authoring jsmd
jsmodules:
  - /assets/posts/reactive-markdown/main.js
css:
  - /assets/posts/reactive-markdown/main.css
---

Many of my blog posts contain interactive demos or content that is generated via `JavaScript`. The prose of my posts, however, is written in `Markdown`. Shuttling data back and forth from the `Markdown` side to the `JS` side can be annoying, especially when data from `JavaScript` needs to be displayed inline with the markdown and updated in real time.

I've experimented with a few ways. The guiding principle around these experiments is to do as much as possible with as little code as possible.

One approach uses a `data-bind` attribute to bind an element to a JS variable. This was the approach I took when writing my [Gambler's fallacy post](/2021-01-26-regression-mean-vs-gambler/).

## Data-Bind Example

In the [JS](https://github.com/tantaman/tantaman.github.io/blob/e11824ea7415f15a765d71aeedfdf6a688bffb75/assets/posts/regression-mean-vs-gambler.js#L168-L202) - export some vars from JS & bind them to the doc
```js
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

In the [Markdown](https://raw.githubusercontent.com/tantaman/tantaman.github.io/master/_posts/2021-01-26-regression-mean-vs-gambler.markdown) - leave placeholders for where exported variables will be injected
```md
If <i data-bind="run_length"></i> coin tosses produced <i data-bind="run_length"></i> heads,
the next <i data-bind="run_length"></i> ...
```

The data bind approach has an incredibly simple implementation and is more than efficient enough for blog demos.

**Side note -** The browser seems to understand when the new innerHTML is equivalent to the old innerHTML and doesn't do any repaints in those cases. Profiling even shows some sort of diffing happening when the new and old innerHTMLs don't match but do overlap. All of this is for a post for another day, however.

**`data-bind` implementation:**

```js
function bindit(exported_data) {
  const to_bind = document.querySelectorAll('[data-bind]');
  for (e of to_bind) {
    const x = e.dataset.bind;
    e.innerHTML = exported_data[x];
  }
}
```

Readers that like such a simplistic approach to rendering `JS` values into `HTML` would love my [150 line TODO-MVC app](https://github.com/tantaman/fk-your-frameworks-todomvc) which is written in pure `JS`.

The `data-bind` approach is super simple but:
1. It is a bit verbose to write out `<i data-bind="..."></i>` every time you want to refer to a variable.
2. The data being exported from `JS` has to be display ready. This can lead to a ton of exports if the same data is re-exported under many formats. I'd rather display-format the exported data in the `Markdown` doc, putting all display time concerns in one spot.

Given I'll be writing lots of blog posts, and thus spending lots of time writing the `<i data-bind"..."></i>` boilerplate as well as iterating on converting data to be "display ready", it makes sense to invest more into an ergonomic API.

**Side note -** investing in software infrastructure is an optimization problem. Under ideal circumstances: the more you invest in infra, the faster the work on top of it goes. If there is a limited amount of work to be done on top of that infra, however, the infra investment should be bounded. Once infra is "good enough", continued investments start producing diminishing returns (unless there is a paradigm shift. A post for another day.).

{% include image.html url="/assets/posts/reactive-markdown/infra-invest.svg" description="More time spent writing infra -> less time required to write a blog entry. Continued infra investments will eventually produce little time savings." %}

## Reactive Markdown

My latest iteration to make authoring interactive blog posts easier is `Reactive Markdown`.

`Reactive Markdown` is the idea that your markdown can reference `JavaScript` variables and expressions. Whenever the underlying data being referenced changes, your `Markdown` document updates automtically to incorporate the new values or expressions.

Simplified example -

<div class="rmd-illustration">
<table>
  <thead>
    <tr>
      <td>
        JS
      </td>
      <td>
        Markdown
      </td>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
<pre>
setInterval(
  () => x += 1,
  250,
);
</pre>
      </td>
      <td>
<pre>
# the count is ${x}
</pre>
      </td>
    </tr>
    <tr>
      <td>
      </td>
      <td>
      </td>
    </tr>
  </tbody>
</table>
</div>
<br/>
### v0.1

The first version of `reactive markdown` is "JavaScript first." In other words, you author everything in a JS file. This made prototyping dead simple, but the ergonomics are still not ideal.

Lets look at some examples.

<div id="doc"></div>
