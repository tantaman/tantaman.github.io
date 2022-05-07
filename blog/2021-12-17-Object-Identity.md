---

title: 'Reference Equality - What is it Really?'
tags: [software-engineering, framework]
---

In programming we're met with things that are completely new. Even though they're new, they're familiar enough to grasp with existing concepts. This converting the new to something familiar helps us to understand things at one level but if the familiar does not perfectly match the new then it causes us to fail to understand at another level.

When the familiar doesn't match the new, we're blinded by a belief that we understand the nature of what we're working with. The familiar hides the new.

Reference equality being equated with identity is one of these things.

Reference equality appears to mean identity. If two objects are equal by reference, they're the same object.

But first, what is identity?

# Identity

{% include image.html url="/assets/images/identity-software/shipoftheseus.jpg" description="Ship of Theseus" %}

The problem of identity has been with us since at least 500 B.C. where it was discussed in the thought experiement the [Ship of Theseus](https://en.wikipedia.org/wiki/Ship_of_Theseus).

It is argued that if, over time, a ship has every single component replaced then it is eventually no longer the same ship. Although we still call the ship by the same name.

This same sentiment is echoed when people say you can't step into the same river twice. The river is always changing (banks eroding, new water added, old water dumped out) and thus not the "same" from one instant to the next.

> No man ever steps in the same river twice, for it's not the same river and he's not the same man. - Heraclitus

The misunderstanding that leads to these paradoxes is an equivocation on the term "identity."

# Multiple Forms of Identity

In everyday life there are two forms of identity.

- Identity by name or "nominal identity."
- Phyiscal identity.

**Nomnial identity** - the Amazon river has the same nominal identity over its lifetime. What I call the Amazon today you recognize as indicating the same Amazon that was referred to when you learned about it in school. What holds nominal identity together is a causal chain of events rather than physical makeup.

**Physical identity**, however, changes at every instant as it represents the exact physical composition of something.

# Reference Equality

So is reference quality nominal or physical identity or neither?

Reference equality looks a lot like nominal identity. A reference points to something as does a name. If the thing pointed to changes over time, the reference still holds just like nominal identity.

{% include image.html url="/assets/images/identity-software/reference.png" description="Reference Equality Providing Nominal Identity" %}

Reference equality being the same as nominal identity breaks down as soon as you intorduce immutability. Once an object is immutable, there's no longer a way to capture the nominal identity of that object via a reference. This is the case since every time you change the object you must create a new one so the reference is always new. Immutable objects are thus left with only having a physical, and no nominal, identity.

{% include image.html url="/assets/images/identity-software/immutable.png" description="Reference Equality Losing Nominal Identity" %}

A program with immutable objects can't express a stable concept over time, only discrete physical states.

# Too Far?

You may be thinking that I'm going too far here. That nomnial identity can still be expressed through variable names.
E.g.,

```typescript
const Amazon = new River({ length: x, avg_depth: y, age: z });
```

of course, you'd need a way to re-bind Amazon.

So:

```typescript
mutable Amazon = new mutable();
Amazon.current = new River({length: x, avg_depth: y, age: z});
Amazon.current = new River({length: dx, avg_depth: dy, age: z+1});
```

and our nominal identity is encoded in `mutable Amazon` (essentially re-creating the concept of a reference in user space).

A more likely case when dealing with immutable structures would be something like the following:

```typescript
let appState = {
  Amazon: {
    inhabitants: [
      {
        fish: [
          {
            type: 'piranha',
            content: '🐟',
          },
        ],
      },
    ],
  },
};
```

Where `appState` can be re-bound but everything inside it is immutable. In such a world (which is common in React apps) the "nominal" identity of `Amazon`, `inhabitants`, and `fish` cannot be ascertained. On every update, we have a new `Amazon`, new `inhaibtants`, new `fish` and so on. If a part of the program saved off a `fish`, that part has no way of knowing if the saved `fish` is nominally the same as the `fish` being received on the next update.

# Note

I'm not advocating abandoning immutable data types. I'd never do that. They're far too important and easy to reason about. Just pointing out where we've drawn a false analogy between reference equality and identity.

1. That for mutable types, reference equality is nominal identity.
2. That for immutable types, reference equality is a partial physical identity. I.e., if two immutable things are equal by reference they're guaranteed to be physically identical but two physically identitcal things are not guaranteed to be equal by reference.

That we do not have a concept of nominal identity in software that is always guaranteed to hold.

Nor do we have a concept of physical identity in software that is always guaranteed to hold. More on this in a separate post.

# What Do?

Intersetingly enough, we've solved this in the relational database world. IDs are our nomnial identities there. The thing behind the ID is almost always mutable with prior versions or records of it being stored separately. If the thing behind the ID always got a new ID on every update, well that'd make retrieving any information you've stored in the past exceedingly difficult for you in the future. That or require you to always pass a timestamp along with what you'd like to retrieve -- assuming time is the only variable that partitions the space of mutation.
