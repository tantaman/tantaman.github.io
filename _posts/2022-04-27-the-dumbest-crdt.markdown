---
layout: post
title: 'The Dumbest CRDT'
tags: crdt programming
---

# DRAFT

# The Dumbest CRDT

A CRDT (conflict free replicated data type) is a structure where concurrent changes made by multiple parties can all be merged together without conflicts. Formally, however, the only constraint is that once all peers in a network have received all messages (in any order) regarding the CRDT, they will all have the same state.

In other words, the dumbest possible CRDT is just one that (a) has a logical clock and (b) replaces the entire document on every update. This type of CRDT is called a LWW or "last write wins" CRDT.

> todo -- add a diagram, explain logical clocks. Maybe linger on back-channels for information and logical clocks vs physical.
> 
> todo -- move into theory and how each new state must be a superset of the prior state and why this property is important to satisfy the conditions of a CRDT

Of course this probably wouldn't work so well in practice. If a text document used this model as its CRDT then every time I type my entire copy of the document would replace yours. Every time you type, your copy of the document would replace mine. The upside, however, is that we'd always have the same version of the document and never diverge :)

# Improving

So how do we get better than this?

The first step is to start subdividing the data structure. Going with the text doc example, rather than treating the entire thing as one piece of state we can split it up into blocks. Each paragraph, for example, becomes a piece of state within the larger document.

Once we take this step we now need to consider:
- Adding a block to a document
- Removing a block from a document
- Updating a block

We'll assume that blocks cannot be re-ordered at the moment. That re-ordering is modeled by a "remove block" followed by an "add block" operation.

We'll also assume that all blocks have globally unique ids and that the id of a removed block is never re-used when adding a block.

> todo -- finish this section