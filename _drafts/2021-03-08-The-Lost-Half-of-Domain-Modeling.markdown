---
layout: post
title:  "The Lost Half of Domain Modeling in OO Languages"
tags: programming software design
---

There are a ton of hurdles to creating good OO design, many of which are outlined here: https://wiki.c2.com/?ObjectOrientationIsDead. This posts assumes you've designed your code well but will show, that due to how we think of (or do not think of) mutations in an OO world, that your code is still terribly broken.

Designing software in an object oriented language usually centers around modeling your domain.

From Wikipedia:

> Domain-driven design (DDD) is the concept that the structure and language of software code (class names, class methods, class variables) should match the business domain. For example, if a software processes loan applications, it might have classes such as LoanApplication and Customer, and methods such as AcceptOffer and Withdraw.

If you're creating presentation software then you'd have classes for:
* Deck - collection of slides
* Slide - thing being presented
* Components - things (like textboxes and images) on a slide

And you might have methods on the Deck like `nextSlide`, `previousSlide`, `deleteSlide` and so on to represent interactions a user would take with a slide deck.

But there's something crucial missing from all of this. Something that has caused [anger at Object Oriented languages](http://steve-yegge.blogspot.com/2006/03/execution-in-kingdom-of-nouns.html), an attempt to throw them out for purely functional languages, quotes like "object oriented design is bad design" and so on and so forth.


However, all of this emphasis on domain modeling is strictly about modeling how things are read and not mutated.

The missing piece is how mutations are supposed to happen and how changes to a model are managed. In the literature on domain driven and object oriented design, actions are modeled as nothing more than methods on objects.
This works up until the point that you have outside observers of your model.

--> non observed model has transactions due to exception handling. If the mutation method completes then all mutations happened. If it throws, they did not.
--> And if nobody can observe during mutations we're fine. But ppl can generally observe partial mutations during mutations due to data-binding or observers on models.

Our domain accurately reflects a representation




 We create classes that represent objects from the domain. We add relationships between these objec


 https://www.johndcook.com/blog/2011/07/19/you-wanted-banana/

 "Pick hard, valuable problems. Work on those. Build good things. Trust me, there’s almost no competition in that space." -- https://www.quora.com/Does-object-oriented-programming-suffer-from-good-ideas-but-bad-design