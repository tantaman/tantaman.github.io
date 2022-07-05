---
title: [DRAFT] What am I building??
tags: [programming]
---

What is [Aphrodite](aphrodite.sh) and what am I aiming to accomplish by building it?

To simplify application development. The hardest thing in application develpoment being state management so first and foremost

> To fix state management.

And a little more specific

> To remove incidental complexity from state management for modern applications.

And even more specific, but which is a non-obvious statement at the outset,

> To make peer-2-peer & offline-first software as easy to develop as traditional client-server software.
 
This statement is the conclusion of analyzing the complexities involved in state management, current software trends, and which state models are most flexible, below.

On to state --

# State!

State management is always the bane of our existence when writing software.

*Why?*

**The essential reasons**
- State spans time and space. 
- The more stateful variables you accumulate, the more possible configurations to consider.
- The more functions that operate on that state, the more contracts that state must uphold and the more avenues available to modify the state.

**The incidental reasons**
1. State, in modern applications, is duplicated. It lives on the server, on the client through caching, on the client through optimistic updates, spread across multiple devices (mobile, desktop, tablet, etc.) in various states.
   - These states need to either be consistent or eventually converge to the same value
2. State might be deployed in a polyglot fashion (e.g., live in `IndexDB`, `SQLite`, or `Postgres`. Accessed via `Swift` / `TypeScript` / `Kotlin` / `Python`), complicating convergence and the preservation of invariants.
3. State is often encoded via "storage types" rather than "semantic types." E.g., an `ID` is typed as a `string` or `int` rather than `ID_of<User>` or a connection as `List<Post>` rather than `Query<Post>` and timestamps as `ints` rather than `UTCTimestamp<Seconds>`, etc. (see [these are not types](https://tantaman.com/2020-05-19-These-Are-Not-Types.html)).
4. Valid transitions between states and valid states are not easily expressed.
5. Observing state changes is not well supported in current programming languages. E.g., programming languages don't have support for committing a transaction to memory and only notifying observers of the change once all variables in the transaction have been updated -- or rolling back the full transaction in the face of a failure. (link to mutation primitives post? clojure?)
   - Redux, Solidjs, Svelte have mad strides here but they're limited to the UI space
   - Functional languages side step most of these problems through immutability but open new problems (e.g., updating deeply nested values) in the process (link to your post on identity and [clojure discussion of identity and state](https://clojure.org/about/state))
6. Schemas that represent state (data) in our application are not shared with schemas that represent it in our logs and/or the data warehouse.
7. Unnecessary impedence mismatches between in-memory representation of state and on-disk (e.g., in the DB) representation.
   - Post on "the relational model _is_ the model" / "there is no impedence mismatch, you're just modeling it wrong"
8. Peers/clients/servers can be operating at different versions while communicating with one another, having different views of what "shape" (schema) the state should have. (datomic?)

**In-between reasons** -- In-between reasons are concerns around state (data) that the industry at large does not yet understand as being essential properties of state. These are concerns like: security, permissions, and purpose use.
- Current best partices focus on "controller level" or "api level" permissions rather than [row level security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
  - Controller/api level security is a huge problem in a world of GraphQL apis and the ability to pivot arbitrarily between nodes
  - Its also a problem more generally as you can never prove that a row of data is not inappropriately accessed in this controller/api gating model
  - Controller/api gating precludes sharing of state with peers

When developing solutions to fix state management, the best place to focus is on eliminating incidental complexity and creating supporting infrastructure for the in-between complexity.

# Why Indicidental Complexity?

Solving the essential complexity of state management requires being able to clearly specify the requirements on your state. A human component -- a clear understanding of the problem being solved and how to translate that to types, invariants, tests, & other artifacts -- is also required. Essential complexity, being essential to the specific problem and requiring specific domain knowledge, will always exist and always require thinking agents to resolve it.

Solving the incidental complexity of state management is something tooling and infrastructure can and should do for us.
Programmers have been tied up in all sorts of incidental complexity (complexity not related to solving the core problem or business needs) which have had various tooling and infrastructure solutions created over time to remove this complexity --

- Deploying & running code
  - Kubernetes, Heroku like "push to deploy" experiences, serverless (e.g., AWS Lambda, Cloudflare workers)
- Updating a UI in response to state changes
  - React showed the way here. That we can render the UI on state change the same way we render it on initial load.
- Memory management
  - Garbage collected languages
  - Rust encoding resource ownership into the type system
- Back-end-for-front-end
  - Firebase
  - Parse
  - Apollo, Relay, GraphQL
- Safely sharing data between threads
  - Akka
  - Clojure STM
- Mapping from relational to OO worlds (note: I think this is largely a mistake -- to be discussed later)
  - Hibernate
  - Prisma
- Building code
  - Bazel, Vite, Webpack, Gradel, etc.
- Identity management
  - OAuth
  - DID

tldr: programming evolves by first being mired in incidental complexity and later having that complexity removed by clever tooling and infrastructure.  Infrastructure codifies knowledge and uplevels the programmer.

> Some of these abstractions [leak more than others](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/) and sometimes "infra claiming to remove complexity" really just moves us backwards and creates more complexity. Remember all the craze over NoSQL? [Relational DBs aren't dinosaurs, they're sharks](https://www.simplethread.com/relational-databases-arent-dinosaurs-theyre-sharks/). Or the overly zealous push for micro-services everywhere which reached fever pitch with "micro-repositories"?

All the incidental complexities involved in state management, listed above (the incidental reasons), can be resolved by addressing a few areas:

- The state distribution spectrum
- The impedence myth
- Mismodeling
  - Storage level, rather than application level, thinking
  - Becoming more declarative

(where does polyglot fit?)

My claim is that there's no comprehensive solution to removing the incidental complexities bound up in application state management. All we have are pieces focused on thin slices of the problem and not applicable across the state distribution spectrum.

# The State Distribution Spectrum

The "state distribution spectrum" refers to how either centralized or distributed some set of state is.

On one end we have all state being local to a single process. On the opposite end we have state being distributed across many processes.

> For simplicity, we'll assume a process is single threaded. I don't think this simplification reduces the generality of the discussion given a process of N threads can be thought of as N processes of one thread -- which is captured by the right hand side of the spectrum.

Why is this important? Because state is moving inexorably further and further to the right hand side of the spectrum and any state management solution must account for this.

## Historical March

Recent history (1990 onward) has seen a consistent march from the left side of the specrtum to the right. (Note: A similar cycle may have already repeated itself in the mainframe era but I'm not familiar with that era.)

- 1990 - Personal computers - all state local to the application and on a single machine.
- 1995-2000 - Early Internet - all state centralized on the server with a rendered, and thrown away, representation delivered to the client. Updates to state come from the service provider.
- 2000-2008 - Web 2.0 - all state is still centralized with the service provider. Updates to state now able to come from clients in addition to the service providers. Clients only update objects they own. Two clients rarely ever able to update the same object (row).
- 2008 - mobile - some state starts to live on device. State sync is managed via the service provider. Accidentally overwriting changes is common.
- 2010 - single page web applications - web starts getting local storage, local caching of resources in the browser. Looking more like mobile apps and having similar problems.
- 2015 - collaborative web & mobile applications - Web 2.0 but now multiple clients (writers) can update the same objects at the same time. The majority of state is still server side with thin slices managed on the client.
- 2020+ - the world is trying to figure out decentralization (blockchain not a requirement), self custody of data, distributed identity and privacy. The majority of state will be on device, a network may consist only of peers rather than clients and service providers, many writers to the same object will be common.

> Note: you're skipping over the details of service provider distributed systems architecture in these eras. E.g., a single service provider had to manage all of the state problems of 2020 but they were doing it way back in 2000. The time sensitivity was different as the geographical distribution of the networks was constrained and network links and hardware could be centrally planned. NTP could suffice in some environments. Lamport clocks in others. Strong consensus (e.g., single master and Paxos/Raft) in others. These same strategies, however, break down when the network is ad-hoc and composed of peers with vastly varying levels of connectivity, uptime and resources. Fundamentally new technologies are required for "planet level and ad-hoc" distribution of state.

> Note: a push back would be "do we really need to consider ad-hoc networks and planet level distribution?" We should show how common this is with some basic examples. And maybe some first principles?

## Distributed State Theses

1. Software is only getting more distributed, more collaborative and more peer oriented. A state management solution must thus be distributed, collaborative and peer 2 peer.

2. Given a solution that exists fully on the right hand side of the spectrum is more powerful than one on the left, being distributed and peer2peer does not preclude the solution from being used to model simpler state requirements.

3. If the system is designed right, modeling and supporting simpler state requirements is no harder than it would be in a system designed only to target those simpler requirements.

# The Impedence Myth

We've been under a false impression that there is an impedence mismatch between how data is modeled in a normalized relational database and how it is modeled in memory. Great pains are taken to convert the relational model to an "object oriented model",  resulting in a total loss of valuable information.

We have so many problems keeping application state consistent in memory, vastly fewer problems keeping it consistent in our relational databases.

Why? The relational model helps us keep things consistent --

1. Is normalized, removing duplication of data and thus removing data consistency problems
2. Does not conflate edges & relations with collections
3. Supports transactions. Allowing us to mutate an entire set of values or none of them at all.
4. Enforces constraints. Uniqueness, foreign key constraints, cascading deletes, etc.

We're doing ourselves a diservice by abandoning these features after loading data into memory.

When interacting with state in memory we must be able to:

1. Keep our state normalized. Only one copy of an object of a given identity.
2. Wrap state updates in transactions and roll those transactions back if they cannot be fully applied.
3. Differentiate between a collection (List/Array) and an edge.
4. Support cascading deletes

The in-memory model should match the relational model. The schemas should be the same.

## SQL, Data Loading & the source of the myth

Graph is the common ancestor. In-memory we traverse records like a graph. Relationally, we do the same but SQL obscures this.

# Mismodeling

# Use Cases



# How?



---

I'm verbose here given a single term has yet to surface which clearly and unambiguously captures the current moment. Web3, Web5, dapps are all too loaded, too undefined and too tied to the current crypto bubble.




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

---

In the UI realm we have:
- Redux, XState, React Context
- React/Vue/Solid/Svelte

In the UI-middleware realm we have:
- GraphQL w/ Apollo & Relay
- Rest w/ ReactQuery, WunderGraph, TRPC and others

On the server we have:
- SQL
- Prisma

For reconciling changes in a distributed system:
- CRDTs
- Operational Transform
- Paxos & Raft (in practical terms, db managed synchronization)

