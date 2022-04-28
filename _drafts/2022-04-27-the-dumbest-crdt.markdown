---
layout: post
title: 'The Dumbest CRDT'
tags: crdt programming
---

# DRAFT

# The Dumbest CRDT

A CRDT (conflict free replicated data type) is a structure where concurrent changes made by multiple parties can all be merged together without conflicts.

**Wikipedia** definition:
> In distributed computing, a conflict-free replicated data type (CRDT) is a data structure which can be replicated across multiple computers in a network, where the replicas can be updated independently and concurrently without coordination between the replicas, and where it is always mathematically possible to resolve inconsistencies that might come up

Formally, however, the only constraint is that all peers in a network have the same representation of a structure after seeing the same sets of messages for updating that structure. These messages can arrive in any order and over any period of time.

This means that the dumbest possible CRDT is just one that (a) has a logical clock and (b) replaces the entire document on every update. This type of CRDT is called a LWW or "last write wins" CRDT.

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