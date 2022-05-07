---
layout: post
title: 'CRDT Theory'
tags: crdt programming
---

CRDT is grounded in mathematical properties the ensure the absence of conflicts
- Monotonicity
- join semi-lattice
- Commutativity

How does each guarantee this? Associativity doesn't matter because we're always applying ops left to right.

- Commutativity -> Counters example.
- Monotonicity -> ? need pariting with LWW? We know how to resolve divergence. Always take greatest value.
- Semi-lattice -> ?

> any state based object that satisfies the monotonic semilattice property is SEC (strongly eventually consistent)

- So we must be able to compute the least upper bound of two states...
- And states _cannot_ decrease. Must remain equivalent or always increase. "inflationary" states.
  - Replacing the whole doc is <= so ok
  - The "doc" in this case can be elided from state since it is just replaced?
  - The clock thus just becomes the state and the clock is always increasing?
  - The clock is what is used to compute LUB?
  - How does this interact with "clock pushing"? --> LUB is always Max(clock1, clock2)



How does yjs note continuously send same updates over and over if the updates cause the local clock of the given replica to increment?

Add only set is a CRDT given it forms a lattice. LUB is the union of two states. Ordering is subset notation.

---

Is my row-LWW-with-clocks model a CRDT?
Order is by clock.
Merge is by clock push.
LUB is clock max.

Clock pushing can even handle deletes without ever recording the delete?
But what oddities could clock pushing create?


# Why converge?
Because merge always computes the least upper bound and, since LUBs are orderable, all things will trend to the LUB?

But ops must commute... So does ordering matter?

(A) - (1) Commutative & (2) Idempotent guarantees convergence.

Show that LWW w/ clock push is commutative and idempotent?

Given (A), does LUB lattice even matter?

Maybe it is just another way of saying it?? Given joins are associative, commutative and idempotent?

So if `merge` forms a semi-lattice then it satisfies (A). Associativity is an extra constraint we don't need though...

What are the practical problems of clock pushing?

---

Does commutative and idempotence alone guarantee convergence?
Consider set addition and removal.
Well remove is not commutative across add.
It is commutative with itself. As is add.

So we need to handle when there is more than a single operation..
This is what join and the lattice unlocks? Conflicting states are always joined via merge, regardless of the ops underneath... if the join forms a lattice they'll converge... always trending towards the LUB.
