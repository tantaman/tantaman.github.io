---
title: Typed Literals ARE Constants!
tags: [software-engineering]
---

```
(option 1) display.setLayout(Layouts.FIXED);
(option 2) display.setLayout('FIXED');
```

# **Are both lines of code above using constants?**

I keep getting push-back that the first line is better practice than the second line. When reviewers see something that looks like the second line they say “define that in a constant.”<!--truncate-->

I’d understand their complaints if the method being called was not typed, but it is.

    type Layout = 'FIXED' | 'FLOW' | 'GRID';
    function setLayout(layout: Layout): void;

When the thing being called is typed as above, then there is no need, no purpose, and no advantage in defining these string literals in constants. Said another way, `Layouts.FIXED` and `'FIXED'` are equivalent. They’re just spelled differently.

To prove that they’re equivalent, run through the exercise of changing the accepted layout parameter from `FIXED` to `STATIC`. The consequences (code changes you need to make) are the same in both situations.

In option (1) you need to run through and change all references to `Layouts.FIXED` to `Layouts.STATIC`.

In option (2) you need to run through and change all references from `'FIXED'` to `'STATIC'`.

But one may say in option (2) you don’t know where to go to change these literals. That would be incorrect. Since the use of these literals is typed you’ll get compile time errors that call out every point where `'FIXED'` needs to changed to `'STATIC'` — the same as you would if you used option (1).

```
type Layout = 'STATIC' | 'FLOW' | 'GRID';
function setLayout(layout: Layout): void;
```

```
const LayoutTypes = {
  STATIC: 'STATIC',
  FLOW: 'FLOW',
  GRID: 'GRID',
}
```
