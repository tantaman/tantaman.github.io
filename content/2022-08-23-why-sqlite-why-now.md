---
title: 'Why SQLite? Why Now?'
tags: [programming, edge]
---

I've been sucked down a `sqlite` rabbithole and I'm all-in on it.

So why `SQLite`? And why now?

For me, its about a bunch of different angles

1. Reducing cloud costs
2. Breaking the speed of light
3. Turning edge architecture upside down
4. Enabling SQL for more use cases
5. Giving people control of their data
6. Consistency use cases - do you really need strong consistency?
7. Transactions... intermittent state

Lets take a look at the first one.

# Data Consistency Needs

I think the client-server model has largely locked us into not thinking about what level of data consistency we actually need. In traditional web applications, all changes go through a central service and are generally strongly consistent.

The vast majority of state does not need strong consistency. User registration certainly does -- you don't want two users claiming the same handle. But does

- Jotting down private notes?
- Writing and making a post?
- Upvoting a comment?
- Adding an item to a shopping cart?

In all of these cases a user is interacting with something that only they can create and update. If the user is the authoritative source of all that information, you hardly need to send every edit to it through a central server. At some point you do (e.g., at checkout, or to make the post publicly visible) but not until then.

Even much shared state does not need strong consistency. Users collaborating on a document or drawing will largely work of different sections so as not to conflict, allowing state merging to be done asynchronously and sometime after actual edits were made. If they do conflict, simple strategies like last-write-wins often suffice. More complex strategies for merging state (e.g., sequence CRDTs) exist for use cases that need to not drop any information.

# Turning Edge Architecture Upside Down

There's a lot of buzz about edge computing.

The fundamental goal of edge computing is to increase the speed of applications by moving resources closer to users.

We've already had one iteration of this (CDNs) but that was focused on static resources. The new iteration is focused on compute and dynamic data.

Edge compute deployments come with a new set of complications. E.g., if you deploy data-reliant application logic to *Singapore* but leave your database in *Ohio* you're probably going to have a really bad time. Those Sing. -> Ohio round trips for each DB call will be way worse than the single user -> Ohio round trip that you would have had previously had you kept the application colocated with the database.

To me, current edge architectures are an attempt to solve new problems by applying old patterns and generating a ton of incidental complexity for the developer to deal with.

Current edge architectures, or really all web application archtiectures, are underpinned by the idea that a central service is the authoritative source of all information.

This paradigm influences every single design decision within the app.
- Any data on the client is now only seen as a cache and something that can be blown away. 
- All writes must be persisted on the server.
- Any optimistic write made by a client can be invalidated by the server.
- The client almost always requires internet connectivity to function.

What if we flipped everything on its head?

![blue-idea](./blog-assets/why-sqlite/blue-idea.jpg)

Lets instead say that the user's local device is the authoritative source of information for that user.

I mean what is more `edgy` than putting storage and compute on the user's own device?

This paradigm shift completely changes how applications are architected but, I argue, it vastly simplifies them.

# Simpler Architecture

When you can treat your local data store as an authoritative source of information, this enables abstracting away a large swath of complexity.

You read and write to your local data layer and it is your local data layer that manages:
1. Syncing changes back to a server or other peers
2. Receiving updates from a server or peers
3. Notifying the application that new data is available

Since all reads and writes are local, you're not worried about network latency.

Since your local data store is an authoritative source of information, you're not worried about cache invalidation.

Of course there are tradeoffs. The most obvious one to deal with is data consistency. Others are --

1. How much data can and should you store locally?
2. How do you signal to the user that the local set could be incomplete from the perspective of other peers?
3. 

# Lower Cloud Costs

# Breaking the Speed of Light

# Consistency Choices

# Data Custody

# SQL as Apex Predator

## Local-First / Offline-First / The Upside Down

This paradigm shift is beginning to get a name.

- [Local-First](https://www.inkandswitch.com/local-first/)
- [Offline-first](https://www.offlinefirst.com/)
- [Braid](https://braid.org/)

And backed largely by CRDTs and eventually consistent state algorithms.


 They add a bunch of incidental complexity by making you have to figure out what components to deploy where and what dependencies would prevent such deployments.



CDNs are actually very transparent when compared against the edge compute architectures of today.

To me, these edge architectures are... slightly nonsense.

 CDNs are an early iteration where content was moved close to the user. Now compute is also being moved

Now once you're pushed to the edge CAP becomes an issue since the embedded DB actually exists in a network of embedded DBs.

To me, current edge architectures are an attempt to solve new problems by applying old patterns. ~~E.g., the CDN model was very successful. The rules for static content do not apply to compute, however.~~

# Enabling SQL for More Use Cases

When it comes to CAP theorem, SQL has solidly existed on the CA side of the spectrum. It provides strong consistency
and availability but has no tolerance for network partitions.

At first glance you might wonder why CAP would ever apply for an embedded database like SQLite.
What is there for it to be partitioned from?


---
Scratch