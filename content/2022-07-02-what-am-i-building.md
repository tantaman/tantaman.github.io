---
title: What am I building??
tags: [programming]
---

What is [Aphrodite](aphrodite.sh) and what am I aiming to accomplish by building it?

First and foremost, to fix state management.

State management is always the bane of our existence when writing software.

Why?

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



There's N more options missing but lets consider these 5 first. These exist on a spectrum -- from

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