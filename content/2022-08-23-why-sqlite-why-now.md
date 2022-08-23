---
title: 'Why SQLite? Why Now?'
tags: [programming, edge]
---

I've been sucked down a `sqlite` rabbithole and I'm all-in on it.

So why `SQLite`? And why now?

For me, its about a bunch of different angles

1. Enabling the relational model for more use cases
2. Respecting the consistency needs of data
3. Breaking the speed of light
4. Simplifying edge architecture by turning it upside down
5. Reducing cloud costs
6. Giving people control of their data
7. Bringing transactions to application memory

Let's take a look at each one.

# Enabling the Relational Model for More Use Cases

The relational model has stood the test of time and proven itself to be one of the best choices you can make for managing application state. Maybe you could even say [it is an apex predator](https://www.simplethread.com/relational-databases-arent-dinosaurs-theyre-sharks/).

That being said, relational databases are firmly on the CA side of CAP. In the face of a network partition, they sacrafice all availability.

Wouldn't it be great if we could use our relational databases even in cases of prolonged network partitions?

[With a few tweaks](https://github.com/tantaman/conflict-free-sqlite) we can add an eventually consistent layer atop relational databases that can stay available in the face of network partitions. This means

- We can suddenly use `SQLite` for peer to peer applications.
- That we can have a multi-master relationship between our server and client.
- We can allow clients to make arbitrary changes to their local database and merge changes to, or from, the server (or other peers) at some arbitrary point in time in the future

This is very appealing to me where I have many applications that I want to allow the user to interact with their data without waiting for a response from the server and to be able to sync their data between all devices they use. It is also convenient that this can be built atop existing technologies and my existing storage solution rather than requiring me to bring in something new.

All of this relies on eventual consistency and thus begs the question of what data consistency needs data actually has.

# Respecting the Consistency Needs of the Data

The lack of options in the relational model has locked us into not thinking about what level of data consistency we actually need. As such, in traditional web applications all changes go through a central service and are generally strongly consistent. In this realtional + client-server paradigm, we don't even reach for eventual consistency until we run into performance, availability or scaling problems.

This has blinded us to the fact that large swaths of state do not ever need to go through a central server or need strong consistency.

User registration certainly does need strong consistency -- you don't want two users claiming the same handle. But does

- Working on anything that is private to the individual user?
- Working on anything (e.g., a post) that is private until published?
- Upvoting a comment?
- Adding an item to a shopping cart?

By unlocking eventually consistent options atop the relational model, we give developers the ability to model all of their data in a familiar way and with the consistency options that make sense rather than just those that are at hand.

The lack of options for eventual consistency and state distribution has put us down a path of default strong consistency and client-server architecture that is
- Expensive
- Complex
- Incompatible with distributed and edge computing
- Has hard speed limits
- Precludes self-custody of data

This is being revealed in ever more painful detail today as we try to fit the square peg of strong consistency & client-server models into the round hole that is distributed & edge computing in an attempt to overcome the speed of light.

# Breaking the Speed of Light

![light](./blog-assets/why-sqlite/light.jpeg)

For applications that require a server for a large percentage of their interactions (e.g., to ensure strong consistency of writes), the speed of light becomes quite problematic.

Checking our [napkin math](https://github.com/sirupsen/napkin-math) we can see that

- NA East <-> West takes **60ms**
- EU West <-> NA East takes **80ms**
- NA West <-> Singapore takes **180ms**
- EU West <-> Singapore takes **160ms**

two sequential round trips from `NA West` to `Singapore` will get you almost half a second of delay.

In the "strongly consistent, client-server paradigm" (from now on called "the paradigm"), the path of resolving this roughly goes as follows:

1. Bundle resources (js, css, html, etc.)
2. Add a CDN
3. Add application servers in more regions
4. Do server side rendering
5. Add read replicas of the database to new regions
6. Add optimistic writes to the application
7. Shard the database, putting masters of given replicasets closer to certain users
8. Put some low-value code into edge functions
9. ?

This is a lot of work and a lot of moving parts just to shorten the lenght of and reduce the number of round trips. A lot of work just solving incidental rather than essential complexity. Yeah, the work delivers business value by making your app faster but the work isn't tied to the business's core mission or competency.

My 8th statement might raise some eyebrows. "Low value code." I say this because the example use cases for edge functions [certainly aren't very compelling](https://www.netlify.com/blog/edge-functions-explained/#example-edge-functions-use-cases).

Sure you can throw all of your business logic into the edge but that probably won't behave as you expect (to be seen later).

The complexity of scaling "the paradigm" and the lack of compelling edge compute use cases for apps architected under "the paradigm" points to the fact that we've hit the limits of "the paradigm." "The paradigm" isn't ready for and was never made for edge computing.

# Turning Edge Architecture Upside Down 🙃 

As we've seen, the fundamental goal of edge computing is to increase the speed of applications by moving compute & state closer to users. Similar to a CDN but also drastically **not** similar **at all** to a CDN. Moving compute and state is just not the same problem as moving static resources and caching responses.

E.g., if you deploy data-reliant application logic to *Singapore* but leave your database in *Ohio* you're probably going to have a really bad time. Those `Sing. -> Ohio` round trips for each DB call will be way worse than the single `user -> Ohio` round trip that you would have had previously had you kept the application colocated with the database. Static resources and cached data don't have behavior so placing copies of them everywhere only has upside.

Current edge architectures, being beholden to "the paradigm", are an attempt to solve new problems by applying old patterns.

What if we flipped everything on its head?

![blue-idea](./blog-assets/why-sqlite/blue-idea.jpg)

What if, instead of always assuming that the server is the authortative source, we assumed that the user's local device is the authoritative source of information for that user?

# Local-First Paradigm

In this world, all requests for state are immediately resolved on-device. The default deployment surface for compute (logic, code) is also on-device.

In the local-first paradigm, the default consistency mode is eventual consistency. This means that state and compute can naturally exist at the edge and are only brought to the "center" when there is a need for strong consistency.

In other words, the common case is edge computing. The specialized case is centralized computing.

If you want your app to seamlessly run at the edge, you need to switch paradigms.

`sqlite` is a great fit for all of this.

- Developers are familiar with SQL
- SQL has stood the test of time (40+ years)
- SQL has massive adoption and many tools exist to interact with SQL from application code
- `sqlite` can be embedded directly into your application
- `sqlite` can be deployed anywhere your application is deployed
- `sqlite`, or any relational database, can be extended to support eventual consistency (see the proof of concept at [conflict free sqlite](https://github.com/tantaman/conflict-free-sqlite))


The local-first architecutre + embedding a database directly into your app has a number of other benefits on top of those we've already seen --

- Simpler architecture
- Reduced cloud costs
- Self custody of data
- Transaction support for mutation of application state

# Simpler Architecture

![simpler](./blog-assets/why-sqlite/Hugh-Jackman-in-The-Fountain.jpeg)

When you can treat your local data store as an authoritative source of information, this enables abstracting away a large swath of complexity.

You read and write directly to your local data layer and it is your local data layer that manages:
1. Syncing changes back to a server or other peers
2. Receiving updates from a server or peers
3. Notifying the application that new data is available

Since all reads and writes are local, you're no longer worried about network latency.

Since your local data store is an authoritative source of information, you're not worried about cache invalidation.

Of course there are tradeoffs. The most obvious is data consistency. This only works for data that either never needs to be reconciled with peers or for data that can be eventually consistent / modeled as a [CRDT](https://crdt.tech/). Others conerns are --

1. How much data can you store locally?
2. How do you signal to the user that their local set of data could be incomplete from the perspective of other peers?
3. How do we bless certain peers (or servers) as authoritative sources of certain sets of information?
4. What CRDTs are right for which use cases?

These questions are being explored by myself and various working groups:
- https://braid.org/
- https://www.inkandswitch.com/
- https://aphrodite.sh/ (self)
- https://github.com/tantaman/conflict-free-sqlite (self)
- https://riffle.systems/

# Lower Cloud Costs

Since compute and storage is moved as much to the user's device as possible, you're no longer footing the bill for every CPU cycle they run and every bit they need to transfer and store.

# Data Custody

The user's device is an authoritative set of information. It no longer needs to ship every mutation off to a central service before that mutation is accepted. The user can be given _control_ of what leaves their device and their application(s) will still function.

# Transaction Support

This is an entirely new point of departure from what has been discussed so far. We've mainly dealt with the distribution of state and flipping the model from "default strong consistency, default client-server" to "default eventual consistency, default distributed."

Given that, I'll keep it brief.

In short, applications are plagued by state management problems. Global state, within a program, is always seen as our enemy. More or less as a dumpster fire. But... a database is giant pile of global state that is being read and written by many different applications.

Why do we have so few problems with the global and mutable state that is the database but so many problems with global and/or mutable state that exist in-memory?

It comes down to:
- The primitives we have to express mutations
- Support for transactions against in-memory data structures
- Support for constraints on im-memory data

If our programming languages had support for ACID transactions against in-memory data then entire classes of problems related to mutable state (in particular, those of observing partial states) would vanish.

We can, in some ways, use an embedded in-memory `sqlite` as a hack to gain this power for our application state.


-------

# Scratch


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


> Data Consistency Needs
> 
In all of these cases a user is interacting with something that only they can create and update. If the user is the authoritative source of all that information, you hardly need to send every edit to it through a central server. At some point you do (e.g., at checkout, or to make the post publicly visible) but not until then.

Even much shared state does not need strong consistency. Users collaborating on a document or drawing will largely work of different sections so as not to conflict, allowing state merging to be done asynchronously and sometime after actual edits were made. If they do conflict, simple strategies like last-write-wins often suffice. More complex strategies for merging state (e.g., sequence CRDTs) exist for use cases that need to not drop any information.



> Edge Architectures

Current edge architectures, or really all web application archtiectures, are underpinned by the idea that a central service is the authoritative source of all information.

This paradigm influences every single design decision within the app.
- Any data on the client is now only seen as a cache and something that can be blown away. 
- All writes must be persisted on the server.
- Any optimistic write made by a client can be invalidated by the server.
- The client almost always requires internet connectivity to function.


What is more `edgy` than putting storage and compute on the user's own device?



Defaulting to strong consistency makes moving state to the edge nearly impossible. If everything is strongly consistent by default, how will you handle writes when your application state and compute is geographically distributed? Especially if you take this to the extreme and put state on the user's device?