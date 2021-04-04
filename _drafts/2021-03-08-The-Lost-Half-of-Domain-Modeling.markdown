---
layout: post
title:  "The Lost Half of Domain Modeling in OO Languages"
tags: programming software design
---

What is domain modeling?

Its the process of modeling a problem domain in code. Usually this is an object oriented process. The developer thinks of all the things in his domain and creates classes to represent them. This intuitively makes sense given we encounter and interact with objects in the world. Unfortunately, what intuitively makes sense doesn't necessarilly make for good code.

The problem is that the set of objects is rarely stable. Objects are transient. Thinking in terms of objects obscures the things that do not change -- the relations and activities.

So you make a game. In your game you have monsters and heros and dungeons and potions. Monsters hurt heros, Heros hurt monsters, potions make heros stronger and so on and so forth. The fact that monster hurt heros and heros hurts monsters and so on is incidental to those types, not a requirement of those types. What if we wany a friendly monster? Or to allow Heros to hurt one another? Or for things like tables and chairs to be able to inbue our heros with the affects of a potion?

The things that don't change are taking damage, doing damage, building stats, losing stats -- in essence the activities don't change. Humans have forever wanted to get from point A to point B. The objects that have taken us there have changed and danced and paraded through our lives without ever changing the intent.

For a domain model to be stable, it must be modeled not in terms of the transient objects that parade through life but in terms of the eternal activities of the domain. You want to model a communication system? Don't base that model on the phone, or the telegram, or radio or fiber-optics. These are part of the parade of objects that come into existence and fade away always in service of the fundamental activity being carried out.


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

Our domain accurately reflects a representation at a snapshot in time.




 We create classes that represent objects from the domain. We add relationships between these objec


 https://www.johndcook.com/blog/2011/07/19/you-wanted-banana/

 "Pick hard, valuable problems. Work on those. Build good things. Trust me, there’s almost no competition in that space." -- https://www.quora.com/Does-object-oriented-programming-suffer-from-good-ideas-but-bad-design
