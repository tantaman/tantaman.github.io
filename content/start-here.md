---
title: 'Start Here'
tags: [philosophy, software]
description: A curated path through a decade of writing on software, philosophy, and the spaces between.
concern: [self, craft]
---

New here? This guide organizes a decade of posts into thematic paths. Pick what interests you, or wander.

---

# If You Write Code

## First Principles

Start with the foundations—patterns that recur across languages and decades:

1. **[The Almighty Function](/2014-01-01-The-Almighty-Function)** - Objects are closures, closures are objects, everything is functions
2. **[Inheritance, Aggregation, and Pipelines](/2013-07-30-Inheritance-Aggregation-and-Pipelines)** - Why pipelines beat inheritance for extensibility
3. **[Practical Laziness](/2014-01-03-Practical-Laziness-in-Programming)** - Lazy evaluation isn't academic—it improves API design
4. **[Oh Lisp](/2013-08-15-Oh-Lisp)** - Why Lisp matters: code as data, minimal syntax, domain languages

## Types and Abstraction

On using type systems to think better:

1. **[These Are Not Types](/2020-05-19-These-Are-Not-Types)** - `int` and `string` are storage types, not application types
2. **[Understanding Generics](/2021-08-22-Understanding-Generics)** - Generics are for the caller, not the callee
3. **[Typed Literals ARE Constants](/2018-10-23-typed-literals-are-constants)** - When types make constants redundant

## React & State

Wrestling with state management in modern frontends:

1. **[React Anemic Models](/2021-12-15-React-Anemic-Models)** - The problem with property bags
2. **[Missing Mutation Primitives](/2021-12-16-Missing-Mutation-Primitives)** - Mutation isn't bad; untracked mutation is
3. **[Reference Equality - What is it Really?](/2021-12-17-Object-Identity)** - Nominal vs physical identity
4. **[Deeply Nested Updates](/2021-12-23-Deeply-Nested-Updates-React)** - Why React re-renders too much
5. **[URLs as Display Data](/2021-12-27-urls-as-display-data)** - Invert the router

## Minimalism in Practice

Proving you need less than you think:

1. **[The Shortest TODO App](/2021-02-12-Todo-MVC)** - ~200 lines, zero dependencies
2. **[Skipping the Bundling](/2022-05-12-skipping-the-bundling)** - ES6 modules make bundlers optional
3. **[Simple MDX](/2022-05-12-simple-mdx)** - MDX without the complexity

---

# If You Build Distributed Systems

## Local-First Architecture

The case for flipping client-server on its head:

1. **[Why SQLite? Why Now?](/2022-08-23-why-sqlite-why-now)** - The manifesto for local-first
2. **[Meta's Graph Model](/2022-10-19-meta-scales-mysql)** - How constraining SQL enabled scaling to billions
3. **[Large Local Storage](/2022-05-13-large-local-storage)** - A 2013 solution to browser storage fragmentation

## Clocks and Consistency

Understanding time in distributed systems:

1. **[Lamport Clock](/2022-10-18-lamport-clock)** - The simplest logical clock, explained
2. **[Do LWW Registers Need Vector Clocks?](/2022-10-18-lamport-sufficient-for-lww)** - When simpler is enough

## Query Systems

Building query layers from scratch:

1. **[Query Builder](/2022-05-26-query-builder)** - Linked lists of expressions
2. **[Query Planning](/2022-05-26-query-planning)** - Converting builders to executable plans
3. **[Chunk Iterable](/2022-05-26-chunk-iterable)** - Streaming results in digestible pieces

## Infrastructure

Understanding the full stack:

1. **[Pi Cloud](/2021-02-14-Pi-Cloud)** - Building cloud infrastructure from Raspberry Pis
2. **[Observability Driven Development](/2021-12-27-Observability-Driven-Development)** - If it's not monitored, it's not done
3. **[Services and Coupling](/2013-06-28-services-and-coupling)** - Why dependency injection isn't enough

---

# If You Think About Thinking

## Epistemology and Statistics

How to reason under uncertainty:

1. **[Understanding False Positive Rate](/2021-01-21-false-positive-rate)** - Base rates matter more than you think
2. **[Regression to the Mean vs Gambler's Fallacy](/2021-01-26-regression-mean-vs-gambler)** - They don't contradict
3. **[Volatility Isn't Risk](/2021-02-07-volatility-isnt-risk)** - Finance's biggest lie

## Language and Identity

How words shape what we can think:

1. **[I Am, You Are](/2020-05-17-I-Am-You-Are)** - You aren't angry, you're experiencing anger
2. **[Non-Conceptual Definitions](/2020-05-25-Non-Conceptual-Definitions)** - Some words are defined by examples, not principles
3. **[Filter, Map vs For Each](/2020-09-13-declarative)** - Programming is upleveling language

## Philosophy

On ideas, danger, and limits:

1. **[Dangerous Ideas](/2020-05-17-dangerous-ideas)** - Ideas need frameworks like power tools need safety protocols
2. **[All Things Are Permitted](/2020-06-29-all-things-are-permitted)** - Laws curb what nature permits
3. **[Mathematical Government](/2021-12-20-mathematician-running-the-world)** - Math cannot confer value
4. **[You'll Always Have a Body](/2022-06-16-always-a-body)** - Even uploaded consciousness has constraints

---

# If You Wonder About Society

## Foundational Myths

How stories shape civilizations:

1. **[Monotheism to Now](/2025-12-02-monotheism-oneness-traps)** - The cognitive style we inherited from one God
2. **[Foundational Myths / 1619 Project](/2022-04-25-foundational-myths)** - Memes as civilizational operating systems
3. **[What If Religion Is Last?](/2021-04-05-Religion-Last)** - Religion as culmination, not precursor
4. **[Doing For Others](/2022-04-25-doing-for-others)** - The present shapes the future, not itself

---

# The Big Picture

**[State of the Union](/2025-12-03-state-of-the-union)** - A synthesis of everything here, written looking back over a decade.

**[Vision](/2021-12-27-Personal-Vision)** - What I'm building toward: software to help people think deeply, local-first architectures, docs as development platforms.

---

# Fiction

**[The Mirror Room](/the-mirror-room/)** - A collection of short stories exploring identity, consistency, and becoming.

---

*Still lost? The throughline is this: **understanding is liberation**. Whether it's understanding why Lamport clocks work, how base rates affect test results, or how monotheism shaped our appetite for singular explanations—deep understanding leads to better choices.*
