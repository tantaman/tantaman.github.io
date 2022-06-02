---
title: 🧶 HTML, CSS & JS. All mixed up together. This time it's different.
tags: [software-engineering]
---

From time to time I run across people decrying the current state of web development with words like:

> We've gone completely backwards! We've gone from separating our structure, style and logic to putting them all into the same file! inline styles! inline html! inline event handlers! NOOOOO!!!

This sentiment misses the point.

In the past, we didn't have a good component model for the web. Not being able to split stuff into components, developers ended up splitting on **incidental boundaries**. They ended up splitting on Structure (`HTML`), Style (`CSS`) & Logic (`JS`). This reduced complexity by a factor of 3 but you still had a problem. All of your **components** were still **bundled together**.

1. All of their structures were mixed together in the same HTML.
2. All their styles were mixed together in the same CSS.
3. All their logic was mixed together in a few JS files.

As time went on, however, things got better.
1. `HTML` got templates and partials
2. `CSS` got imports and pre-processors
3. `JS` got real imports. First with things like requirejs/commonjs/amd, later with ES6


These advancements allowed the untangling components and we hit a brief phase where component definitions would have a bunch of tiny files:

```
- likeButton.js
- likeButton.html
- likeButton.css
```

each with a few lines of code and referencing data from one another.

This atomization of components didn't make sense so developers made the reasonable choice of bundling `html`, `css`, & `js` all back together again. Except, this time, **it was different**. This time we only bundled the `html`, `css` & `js` of a _single component_ together.

Have we gone back to the days of combined & inline `html`, `css` & `js`? Yes, but not in the way you think.

**We now split our code where it matters** -- at the component level.