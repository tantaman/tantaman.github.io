---
layout: post
title: 'Observability Driven Development'
tags: software-engineering odd
---

One of the things I learned quickly while working on large scale systems at Facebook (Meta) was that if your tests passed but you didn't observe your system in production, you had no idea whether or not your system was actually behaving as intended. Without observation in prod, you don't even have a baseline to know what "normal" operation looks like.

E.g.,

- Is 1M QPS normal?
- 500ms per request fast or slow?
- 100 requests per user session, is that ok?
- 6 component renders per app state change?

o_O Who knows.

- How have these metrics drifted over time?
- Is this trend a regression?
- When was the regression introduced?
- How much memory has our app historically used?
- Which releases caused the greatest memory regressions?
- Which features were in those releases?
- ...

All of these things need to be answered to run good software and mantain a high quality bar.

While thinking these problems over and developing best practices for observding systems, I thought I had coined a new term called "Observability Driven Development." After doing some googling, however, I found that a former `Facebook Engineering Manager` left to become CTO of [Honeycomb.io](https://honeycomb.io) which develops products for exactly this problem and calls it by the same name.

Interesting coincidence, esp. given I'm planning on releasing some my personal tooling that is centered around this exact same problem.

`Charity Majors` (Honeycomb CTO) article on Observability Driven Development: [A Next Step Beyond TDD](https://thenewstack.io/a-next-step-beyond-test-driven-development/)
