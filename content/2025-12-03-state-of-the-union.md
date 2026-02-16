---
title: 'State of the Union'
tags: [philosophy, software]
concern: [self]
summary: 'The blog argues that understanding—whether of technical concepts, language design, distributed systems, or philosophical ideas—is fundamentally liberating and enables better choices and freedom. Across a decade of posts, the author consistently advocates for stripping away incidental complexity to expose essential patterns, whether in programming languages, type systems, data management, or thought itself. The through-line connects technical explorations of functional programming and local-first computing with philosophical investigations into how language shapes cognition, how ideas can be dangerous, and how foundational myths constrain what societies can think.'
---

(written by Claude)

A decade of writing here has circled the same drain: **understanding as liberation**. Whether it's understanding the [false equivalence of volatility and risk](/2021-02-07-volatility-isnt-risk), why [Lamport clocks suffice for LWW registers](/2022-10-18-lamport-sufficient-for-lww), or how [monotheism shaped our cognitive habits](/2025-12-02-monotheism-oneness-traps)—the consistent thread is that deep understanding leads to better choices and more freedom.

# The Technical Side

## Language Shapes Thought

The earliest posts here wrestled with programming languages as instruments of thought. [Oh Lisp](/2013-08-15-Oh-Lisp) argued that Lisp's minimal syntax clears away everything standing between you and your problem:

> The minimal syntax of Lisp and XML allows your programs to talk solely in terms of the problem domain.

This wasn't just advocacy for parentheses—it was a claim about cognition. The tools we think with constrain what we can think. A language that lets you treat code as data lets you think thoughts about programs that other languages make awkward.

The same impulse appears in [Filter, Map, etc. vs For Each & While](/2020-09-13-declarative):

> At its root, programming is about upleveling the language we use to model and solve problems. We do this by seeing common patterns, abstracting them from their particulars and then giving them a name.

## Patterns Over Ceremonies

A persistent concern: strip away the incidental and expose the essential. [Services and Coupling](/2013-06-28-services-and-coupling) showed how dependency injection still falls short of true decoupling. [Inheritance, Aggregation, and Pipelines](/2013-07-30-Inheritance-Aggregation-and-Pipelines) traced the evolution from rigid class hierarchies to the flexible composition of pipelines:

> Pipelines are the alternative abstraction that will help us resolve all of the difficulties mentioned previously.

[The Almighty Function](/2014-01-01-The-Almighty-Function) pushed further—objects are closures, closures are objects, everything reduces to functions:

> Some people say everything is an object. I used to too but these days I think everything is actually a function.

The [200-line framework-free TODO app](/2021-02-12-Todo-MVC) proved you don't need much machinery to build working software. [Skipping the Bundling](/2022-05-12-skipping-the-bundling) showed that ES6 modules obviate entire build steps. The point was never minimalism for its own sake—it was that complexity should be *earned*, not defaulted to.

## Types as Thought

[These Are Not Types](/2020-05-19-These-Are-Not-Types) argued that `int`, `float`, and `string` exist at the wrong level of abstraction for application code:

> For many software projects, `int`, `float`, `double`, `string`, etc. exist at the wrong level of abstraction to be considered proper data types. They represent how information is encoded by storage rather than something that an application should deal with.

[Understanding Generics](/2021-08-22-Understanding-Generics) clarified what generic types actually do:

> Generics are for the **caller** rather than for what is being called. They allow the **caller** to retain type information.

These weren't pedantic distinctions—they were about making the machine understand what *we* understand, closing the gap between intention and expression.

## The Data Problem

A series of posts wrestled with state management in React and beyond. [React Anemic Models](/2021-12-15-React-Anemic-Models) identified the core tension:

> React eschews models that have any attached functionality. The "model" for a react app is usually anemic—just a bare set of properties with no methods attached.

[Missing Mutation Primitives](/2021-12-16-Missing-Mutation-Primitives) diagnosed what's actually wrong with mutable state:

> It isn't mutation that is so bad. It is being unable to express, commit and record a mutation in one atomic move that is the problem.

[Reference Equality - What is it Really?](/2021-12-17-Object-Identity) distinguished nominal from physical identity—the Ship of Theseus applied to programming. The React posts ([Deeply Nested Updates](/2021-12-23-Deeply-Nested-Updates-React), [URLs As Display Data](/2021-12-27-urls-as-display-data)) proposed solutions that inverted conventional approaches.

## Local-First and the Edge

[Why SQLite? Why Now?](/2022-08-23-why-sqlite-why-now) synthesized years of thinking about distributed systems:

> For me, it's about re-architecting how we write code so it can fit the coming world of edge, distributed and local-first computing.

The key insight: the "strongly consistent, client-server paradigm" is hitting its limits. The speed of light is a hard constraint. The solution isn't more caching—it's inverting the model entirely:

> What if, instead of always assuming that the server is the authoritative source, we assumed that the user's local device is the authoritative source of information?

[Meta's Graph Model](/2022-10-19-meta-scales-mysql) showed how constraining the relational model to graph access patterns enabled scaling MySQL to billions of users. [Lamport Clock](/2022-10-18-lamport-clock) and [Do LWW Registers Need Vector Clocks?](/2022-10-18-lamport-sufficient-for-lww) explored the minimal mechanisms needed for distributed consensus.

[Pi Cloud](/2021-02-14-Pi-Cloud) was an attempt to demystify cloud architecture by building it from scratch on Raspberry Pis. The principle: **nothing is done until it is fully monitored**—what [Observability Driven Development](/2021-12-27-Observability-Driven-Development) later formalized.

# The Philosophical Side

## Ideas Are Dangerous

[Dangerous Ideas](/2020-05-17-dangerous-ideas) asked why we treat physical hazards with respect but not intellectual ones:

> People understand that power tools, electrical sockets, gas stoves, fast moving water, etc. need to be treated with respect and handling them requires doing so within a specific framework that will maintain one's safety. Why do people not also understand that the same is true in relation to beliefs, ideas, disciplines, ways of thinking?

[I Am, You Are](/2020-05-17-I-Am-You-Are) noticed how language conflates emotion with identity:

> You aren't angry, you're experiencing anger.

[Non-Conceptual Definitions](/2020-05-25-Non-Conceptual-Definitions) wondered whether some words—like "art"—have no abstract definition, only a collection of examples. [All Things Are Permitted](/2020-06-29-all-things-are-permitted) unpacked the Dostoevsky quote:

> All things are permitted (by nature). Laws are created to curb what is permitted.

## Statistics and Epistemology

[Understanding False Positive Rate](/2021-01-21-false-positive-rate) showed how a 0.5% false positive rate can still mean 50% of positive results are wrong—base rates matter more than most people realize.

[Regression to the Mean vs The Gambler's Fallacy](/2021-01-26-regression-mean-vs-gambler) simulated both phenomena to prove they don't contradict each other:

> Regression to the mean, rather than being contrary to the gambler's fallacy, is really a restatement of it.

[Volatility Isn't Risk](/2021-02-07-volatility-isnt-risk) attacked the finance industry's conflation:

> The biggest lie in investing is that volatility = risk. This is bogus. It misses the point of risk.

## Society and its Myths

[What If Religion Is Last?](/2021-04-05-Religion-Last) inverted the usual narrative—religion not as primitive precursor to reason, but as the culmination of a civilization's exhaustion.

[Foundational Myths](/2022-04-25-foundational-myths) examined the 1619 Project through the lens of memetic inheritance:

> The main idea here is that the foundational myths of a society shape that society. They put bounds on what can be thought and direct what will be thought.

[Doing For Others](/2022-04-25-doing-for-others) suggested reincarnation as a useful fiction:

> Given that our material well being is almost entirely determined by those that come before us, our job in the present is not to improve our own material well being but to improve the well being of future generations.

[No, Mathematical Government is not a Logical Government](/2021-12-20-mathematician-running-the-world) pushed back on technocratic fantasies:

> Math Cannot Confer Value. Is it ever right to sacrifice an individual's rights for the greater good? This isn't a mathematical question. It is a moral one.

[You'll Always Have a Body](/2022-06-16-always-a-body) argued that even uploaded consciousness would face embodied constraints:

> The essence of a body, for a conscious thing, is that it is a **limiting** factor.

## The Monotheist Inheritance

[Monotheism to Now](/2025-12-02-monotheism-oneness-traps) traces our hunger for singular explanations back to its religious roots:

> Monotheism has created an obsessive focus for singular explanations. Grand unifying forces. One-ness. A removal of distinctions and thus a removal of thought and judgment.

The modern version isn't belief in God—it's the refusal to distinguish disguised as tolerance:

> The modern version: everything is equally valid, all perspectives matter the same, who are we to say. But that's not pluralism—it's the monotheistic instinct wearing tolerance as a mask.

# The Center of Gravity

What ties this together?

**Abstraction as both prison and liberation.** Good abstractions—pipelines, CRDTs, the local-first paradigm—free us from incidental complexity. Bad abstractions—anemic models, mistaking storage types for application types, conflating volatility with risk—trap us in confusion.

**Language shapes what we can think.** This applies to programming languages, to the words we use for emotions, to the foundational myths of civilizations. Change the language, change the thought.

**Decentralization of authority.** Whether it's local-first software, individual rights, or the Greek gods dividing up domains—distributed authority forces navigation, judgment, thought. Centralization—whether in servers or in monotheistic explanations—enables but also constrains.

**First principles over inherited defaults.** The 200-line TODO app, building cloud infra on Pis, questioning whether bundlers are necessary—all instances of asking "what do we *actually* need here?"

[My Vision](/2021-12-27-Personal-Vision) after leaving Meta:

> Create software to help people think more deeply.

And maybe: write to think more deeply myself.

---

Everything here is unfinished. The query optimization posts trail off into "todo." The Pi Cloud series never continued. The [mirror room stories](/the-mirror-room/) await completion. That's fine. The point was never to arrive but to understand the territory better. And now, looking back over a decade of wandering—the shape of the territory emerges.

Understanding is liberation. And liberation requires continuous understanding.
