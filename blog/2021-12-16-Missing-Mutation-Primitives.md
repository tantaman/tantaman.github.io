---

title: 'Missing Mutation Primitives'
tags: [software-engineering, framework]
image: /assets/images/mutation.jpg
---

I’ve been developing apps for the past ~8 years that use immutable data models. For the ~7 years prior to that, using a combination of mutable, immutable and lock-free data structures.

Immutable models solve endless numbers of problems but what I realized is that it isn’t mutation that is so bad. It is being unable to express, commit and record a mutation in one atomic move that is the problem.

**Object oriented languages don’t have a way to express mutations.**<!--truncate-->

Yes, you can do assignments:

```typescript
this.x = y;
```

And yes, you can batch assignments into methods:

```typescript
foo() {
  this.a = x;
  this.b = y;
}
```

And you can even guard those bulk assignments with concurrency primitives to ensure they’re atomic across threads:

```typescript
syncrhonized foo() {
  ...
}
```

But there’s something massive missing. So massive it creates an inability to handle the following cases.

1. In OO, how do you roll back a large mutation that fails half way through?
2. How do you express everything that should be changed together in one atomic action and not allow intermediate mutations to be observed either in the same thread via listeners or in other threads via direct memory access?
3. How do you roll the entire OO data model back to prior states? E.g., “undo”

# 1 - Mutation Failure & Rollback

Say I have some method that updates a bunch of state on a slide deck:

```typescript
class Deck {
  addNewYoutubeSlide(src) {
    const slide = new Slide();
    const component = new YoutubeEmbed(src);
    slide.addComponent(component);
    this.slides.push(slide);
    this.setSelectedSlide(slide);
    this.notifySelectionListeners();
  }
}
```

Now what do I do if there is a failure between any of those lines?

If the failure occurs before `this.slides.push` there’s no harm — the garbage collector will clean up all my dangling objects.

If the writes weren’t ordered so well (say we push the slide before adding the video) and a failure happened when creating the `video` component, we’ll end up with a blank `slide` in the `deck`.

The worst case is that we get all the way to selecting the `slide` and then fail notifying the `listeners`. Now our `app` is in an inconsistent state. The `Deck` thinks one thing is selected, all the UI components might think something else is selected.

**And this is where OO and mutable data structures begin to fall apart,** with detractors going so far as to say “object oriented design is bad design.” Because how would you roll this failure back? And roll it back in a way that wouldn’t incur another failure or partial update? And make roll-backs composable such that if a mutation is built on top of this mutation, it knows to stop executing and roll itself back too?

# 2 - Prevent Intermediate Observations

If I have a bulk update how do I ensure no observers are seeing changes until all changes are complete? I want my model to be consistent before it can be observed. How do I do this in a composable way?

E.g., if my `Deck` is mutating a `Slide` which is mutating a `Component` on the slide, no notifications should go out from any of those objects until all modifications are complete and all pre and post-conditions hold.

# 3 - Undo Support

This is more than “undo” and about generally being able to roll an `OO` data model back to some prior instant in time. How can you do this reliably? Without the developer having to resort to verbose solutions like the command pattern.

Functional languages solve the above problems by not allowing mutations. By requiring copies of those objects be created with the new data and then, in one atomic motion, the copies replace the original instances.

# The Missing Piece - Expressing a Mutation

What’s missing from OO (and I’d argue functional languages as well) are language primitives that can express mutations.

So how do you express a mutation?

# Changesets

We need the concept of a `changeset`.

A `changeset` represents all of the updates you’d like to make to the domain model without actually performing any of them. `Changesets` can also be composed. If you call multiple methods that themselves return `changesets`, you can keep combining them until you decide it is time to commit the update.

Lets look at a notional example if this were implemented in user space:

```typescript
class Deck {
  addNewYoutubeSlide(src): [Changeset<Deck>, ...Changeset<any>[]] {
    let slideCs = Slide.create();
    const componentCs = YoutubeEmbed.create(src);
    slideCs = merge(slideCs, slideCs.deRef.addComponent(component));
    const deckCs = merge(
      this.addSlide(slideCs.deRef),
      this.setSelectedSlide(slideCs.deRef),
    );

    return [deckCs, slideCs, componentCs];
  }
}
```

Every call that would perform a mutation returns a `changeset` rather than doing the mutation directly.

This way of modeling mutations has some great properties.

1. If you get a changeset back, you know all the values that will need to be set were computed with no exceptions.
2. If an exception is thrown when creating changesets, no mutations were actually made so nothing needs rolling back.
3. Nothing was actually mutated while building a changeset so nobody has observed anything.
4. The changeset has a record of every single mutation that is about to happen, enabling seamless undo & redo or “time traveling” through the data model.

# Committing a Changeset

Getting a changeset that represents everything that would happen from a series of mutations is all well and good but how do you actually update the model with those mutations?

We'd introduce the concept of commiting a changeset. Once all the mutations that should take place have been expressed, we can commit them in one atomic move.

```typescript
function commit(changeset: Changeset<Model>[], log: TransactionLog[]);
```

The second piece we can introduce with `commit` is a set of transaction logs that should record the change. E.g., you can commit a changeset but omit it from your persistence layer by not providing the persistence log. Or commit and omit it from undo functionality by omitting the undo transaction log.

```typescript
commit(changesets, [persistLog, undoLog]);
```

More on the importance of separating out persistence and undo into transaction logs rather than direct observations of the domain model in a future post.

<!-- TODO next post -->

# Where to Commit?

Where does one invoke a “commit” action, however? Commits should never be done within the domain model itself but only at points where the client code (e.g., UI code) interacts with the domain model as these points are “the top of the funnel” where interaction begins and all changes that would be made due to that interaction are returned to.

A release of a user-space implementation of the changeset framework will be available on [Github](https://github.com/tantaman) early 2022.
