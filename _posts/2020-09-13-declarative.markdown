---
layout: post
title: 'Filter, Map, etc. vs For Each & While'
tags: programming declarative functional imperative
image: /assets/posts/filter-map-reduce-vs.svg
---

I've run into the occasional programmer that finds the functional way of transforming collections (`map`, `filter`, `reduce`, `zip`, `pull`, etc.)
harder to understand than the imperative style of `for`, `while` and `for-each` loops.

I.e.,

```
const results = numbers.map(
  x => x * 2,
);
```

harder to understand than

```
const results = [];
for (const x of numbers) {
  results.push(x * 2);
}
```

The underlying problem seems to stem from

1. A lack of familiarity with functions over collections
2. Not seeing programming as a way to uplevel the language used to express and solve a problem

# Upleveling Language

At its root, programming is about upleveling the language we use to model and solve problems.
We do this by seeing common patterns, abstracting them from their particulars and then giving them a name.

Being unwilling to adopt `map`, `filter`, `reduce`, and others of their ilk is being unwilling to discover and make use of new concepts.

Seeing `filter(x)` in code, I know immediately what is happening -- the collection is being filtered.
Seeing `for (e of x)`, I have no idea what is happening in until I read the entire loop.

# Familiarity

In software development we must not always seek to express things in terms that are familiar to us. During development, sometimes we happen across concepts and ideas that we've never seen before. To always try to recast those in terms of ideas that we are already familiar with is to not grow and learn new ideas.

It would be as if the we stopped adding words to the English (or any) language. That would only happen if and when we stop discovering new ideas and learning of new ways to express ourselves.

So if after reading a handful of for loops and seeing that they all share a common theme, come up with a name for that theme and write a function to express it. That's where filter/map/reduce/etc. come from.
