---
layout: post
title: 'Object Identity'
tags: software-engineering language
---

The problem of identity has been with us since at least 500 B.C. where it was discussed in the thought experiement the [Ship of Theseus](https://en.wikipedia.org/wiki/Ship_of_Theseus).

The tldr is that it is argued that if a ship has every single component replaced it is no longer the same ship, even though we call it by the same name.

This same sentiment is echoed when people say you can't step into the same river twice. The river is always changing (banks eroding, new water added, old water dumped out) and thus not the "same" from one instant to the next.

> No man ever steps in the same river twice, for it's not the same river and he's not the same man. - Heraclitus

The misunderstanding that leads to these paradoxes is an equivocation on the term "identity." Our programming languages also get identity wrong and it has been holding software development back since its inception and causing unending misunderstandings between "functional" proponents and "object oriented" proponents.

# Multiple Forms of Identity

In everyday life there are two forms of identity.

- Identity by name. Lets call this nominal identity.
- Phyiscal identity.

The Amazon river has the same nominal identity over its lifetime. What I call the Amazon today you recognize as indicating the same Amazon that was referred to when you learned about it in school. What holds nominal identity together is a causal chain of events rather than physical makeup.

Physical identity, however, changes at every instant as it represents the exact physical composition of something. We'll ignore orientation, position and time for the time being but, in daily life, we consider those as separate from identity.

# Identity in Software

In software, reference equality is considered to be the identity operator. If objects are equal by reference, they're the same object.

But is this nominal identity or physical identity?

I'd say it is nominal identity. The reason being is that the identity holds even if the object is mutated. Like a name, the reference always points to something and we consider it the same thing no matter what physical transformations it may undergo.

Reference equality, imo, is an implementation detail that we've co-opted to stand in for nominal identity. It shouldn't actually represent nominal identity as the abstraction that reference equality is nominal identity begins to break down.
The problem with reference equality representing nominal identity begin to creep in when you introduce immutability.
