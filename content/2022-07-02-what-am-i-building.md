---
title: What am I building??
tags: [programming]
---

What is [Aphrodite](aphrodite.sh) and what am I aiming to accomplish by building it?

First and foremost

> To fix state management.

A little more specific

> To remove incidental complexity from state management for modern applications.

And even more specific, but which is a non-obvious statement at the outset,

> To make peer-2-peer & local/offline-first software as easy to develop as traditional client-server software.
 
This statement is the conclusion of analyzing the complexities involved in state management and current software trends below.

On to state --

# State!

State management is always the bane of our existence when writing software.

Why?

The essential reasons -- because state spans time and space. The more stateful variables you accumulate, the more possible configurations to consider. The more functions that operate on that state, the more contracts that state must uphold and more avenues available to modify the state.

The incidental reasons -- state, in modern applications, is duplicated. It lives on the server, on the client through caching, on the client through optimistic updates, spread across multiple devices in various states. State might also be deployed in a polyglot fashion (e.g., live in IndexDB, SQLite, accessed via Swift / TypeScript / Kotlin).

The in-between reasons -- privacy? permissions? security? purpose use?

Solving the essential complexity of state management requires being able to clearly specify the requirements on your state. Things like type systems, invariants, allowed mutations, tests, and relational constraints allow us to do this. A human component -- a clear understanding of the problem being solved and how to translate that to types, invariants, tests, & other artifacts -- is also required.

Solving the incidental complexity of state management is something our tooling and infrastructure should be able to do for us. Programmers are tied up in all sorts of incidental complexity that, one day, we'll hopefully no longer have to solve. E.g., how to deploy your code, how to discover services, how to fail over between services, how to decrease load times via server side rendering, how to re-hydrate components on the client, how to cache data for responsiveness, how to not leak memory, how to safely access user provided input, how to share data between threads, how to map in-memory representations of data to storage representations, how to monitor our code once deployed, etc. etc.

But lets constrain ourselves to the incidental complexity involved in state management.

This complexity exists on a spectrum. On one end we have all state being local to a single process. On the opposite end we have state being distributed across many processes.

> For simplicity, we'll assume a process is single threaded. I don't think this simplification reduces the generality of the discussion given a process of N threads can be thought of as N processes of one thread -- which is captured by the right hand side of the spectrum.

Recent history (1990 onward) has seen a consistent march from the left side of the specrtum to the right. (Note: A similar cycle may have already repeated itself in the mainframe era but I'm not familiar with that era.)

- 1990 - Personal computers
- 1995-2000 - Early Internet
- 2000-2008 - Web 2.0
- 2008 - mobile
- 2010 - single page web applications
- 2015 - collaborative web & mobile applications
- 2020 - the world is trying to figure out decentralization (blockchain not a requirement), self custody of data, distributed identity, privacy. I'm verbose here given a single heading/term has yet to surface which clearly and unambiguously captures the current moment. Web3, Web5, dapps are all too loaded, too undefined and too tied to the current crypto bubble.


Let's go through each period to see how state was dealt with and what requirements were added to state over time.




is x-state worth mentioning?

 and how its gotten more tied up in incidental complexity now.

These can be declared in a schema that describes our state.

, it controls how our program will respond to future inputs and if it drifts into unexpected territory it makes our programs behave incorrectly.

 Because state represents the outcome of our programs. Its the final goal and if it is wrong the program is wrong.

Client-server & (consensus driven?) single master state problems:

Myriad types of state due to incidental details
1. Server managed state
   - Things like account credentials, for centralized apps (e.g., facebook) the state posts, status updates, etc.
2. Client managed state
   - Things local only to the client. Preferences or settings of the app in the app and not shared outside the app.
3. Server managed state cached on the client
   - This is just server managed state but cached in the client for faster response times
4. Server managed state, optimistically updated in the client
   - Very similar to (3) but the client can mutate this state too
5. Single client managed state backed up on a server
6. Many client managed state backed up on a server

^-- This generalizes to:<br/>
1. Single server
2. Single master/writer & writes replicated to others (effectively caching)
3. (2) with optimistic updates (effectively write through caching)

There's N more options missing but lets consider these 5 first. These exist on a spectrum. On the one side we have everything managed by the server and all updates to and reads of the state require round trips to the server.

This side of the spectrum was web development in the 90s when there was no dynamicism on the client. You requested a page, the server loaded everything it needed from the database, rendered the page and furnished you with a response.

Centralized consensus managed state vs decentralized strongly convergent state.

Local/client only state problems:
1. Seeing transient/partial updates
2. Invariants being violated after mutation(s)
3. Observing a mutation while in-flight and thus acting on malformed domain model (basically restating 1 & 2)
4. Reacting to changes / knowing about changes
5. Memory leaks once reacting to changes is introduced
6. Modeling a state machine (e.g., screens, routers, x-state)

---

Relational model as _the_ model. No more impedence mismatch.
Get our:
- transactions against domain model
- foreign key constraints (cascading deletes)
- row level privacy
- query language
- etc

---

What Svelte and Solid are _trying_ to do but missing. Domain model needs to express this stuff not component state.

---

CRDT based state management, where everything is thought of from the perspective of client first, is a revolution in web development.


---

Web as subscribable and patchable resources?