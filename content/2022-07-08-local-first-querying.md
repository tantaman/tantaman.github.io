---
title: Local First Query Design
tags: [programming]
---

> part of a series as I think through problems related to deploying https://aphrodite.sh/ in real world apps

In a local/offline-first world, how do we query for (and keep up to date) the data needed by our app? The answers differ based on where on the **state plane** your state needs sit.

![state spectrum](./blog-assets/local-first-querying/spectrum.png)
<center><i>State plane</i></center>
<br/>

**Bottom left** - All of the data is local and the are no peers to collaborate with. Here we can use traditional methods such as saving data in a db or in the filesystem & querying it with SQL or filesystem operations. Data is always up to date given there are no changes to bring in from peers. Example here being the `TextEdit` app on MacOS or `Notepad` on Windows.

**Top left** - the entire dataset fits on each peer but there are many peers to collaborate with. Queries can still be fully resolved against the local dataset. The local dataset is subscribed to all changes from all peers so it stays up to date. Examples here being a yjs doc, google doc, excalidraw drawing.

**Bottom right** -
Traditional client-server apps fit here. In this case there are two "peers": the service provider and the client. Clients don't interact directly -- instead are abstracted away by the service provider. Slices of data are loaded from the service provider into the client app & updates are received via subscriptions. The "local" data is also only a cache and can be blown away at any point by an update from the service which is the authoritative source.

Very similar to traditional client-server apps, we have offline-first client-server apps. This is the same as the client-server case but the big difference is that the local data is no longer seen as simply a cache but as an authoritative source of information. The client can function and modify data while offline. This "functioning offline" means that queries are considered fulfilled even if they're only fulfilled from local data and do not include server sent data. There are two sides to this: all state can be sent to the client or only slices of state can be sent to the client.

**Top right** - in the most difficult quadrant, we have the case where
- Many peers exists and collaborate directly with one another
- The total dataset is too large to fit on one peer or too write heavy for a peer to subscribe to all changes

An example here being a p2p social app. Smaller scale examples would be perf optimizations where you shouldn't receive updates to things you're not interacting with.

> Note: traditional client-server software is only included for illustrative purposes. It doesn't belong in the chart given its sychronization protocol is that of a single master (the service provider) arbitrating changes.

- **Thesis 1:** the green cases are all already solved or easily solved. I think this is self evident but please note where you disagree.
- **Assumption 1:** the top right corner is the most generic case and solutions for that can support all other cases.
- **Assumption 2:** using solutions for the top right to solve for all areas is no more complex than using solutions dedicated to those areas

Given **thesis 1**, we'll focus only on the orange and red cases.

What both cases have in common are that the clients can only keep local slices of data.

# Local Slices

There's two factors to consider when thinking over local slices.
1. Is the data model hierarchichal and data access always done in a hierarchichal way?
2. Is data non hierarchichal or accessed in non-hierarchical ways?

Case (1) is pretty straightforward to solve
1. Slice the data model up into manageable documents
2. The application only subscribes to the subset of documents it currently cares about

Examples of this method in practice are --

- Filesystem / DropBox like apps. Each folder can be a doc the contents of which is an index (the file names) of what is in the folder. The client only fetches and subscribes to the folders and documents they have open. For folders with thousands of items will only be tens of KBs. Updates to those docs will be small deltas.
- Wikis and Blogs. For the blog case -- open a post you're interested in, download it, model comments as a field nested on the post, subscribe to the post to receive new comments and post edits.

**Thesis 2:** Local slices of state is a trivial problem when the data is hierarchichal, accessed in a hierarchichal way and collections within a node are bounded. <br/>
**Rationale:** This is the case since the application data is nicely partitioned into manageable chunks as illustrated by the prior examples.

You start to run into problems as soon as you want to access the data in a non-hierarchichal way. E.g., if you want to implement a feed of comments or search and interact with the blocks (e.g., tables & paragraphs) across all documents.

![comment feed](./blog-assets/local-first-querying/comment-search.png)
*Comment feed*

![block search](./blog-assets/local-first-querying/block-search.png)
*Block search w/ interactive editing*

The other area where you hit problems, even in the hierarchical model, is if collections are very large or unbounded. E.g., a filesystem folder with hundreds of thousands of documents. A 100k item list at 20 characters per file name would be 2MB to transit. It is unlikely the client wants all of this data -- probably just the first few items like the 10 newest files. And once we've filtered it, we still want updates in case a newer file is created.

**Thesis 3:** Non-hierarchical data access and unbounded collections require query (e.g., filter, sort, limit & cursoring) support. <br/>
**Rationale:** This is the case since the client can only interact with this type of data by fetching a subset of it. Fetching a subset of data requires being able to specify the subset in abstract terms which is (by definition) a query.

> Note: non-hierarchichal access is a special case of unbounded collections in a hierarchy. E.g., data access from an abstract root node to which all other nodes are connected.

# Querying Slices

We've established the need for slices of data, when that need occurs, and that slices are expressed via queries.

So:
1. How does a query for a slice get fulfilled in a local-first architecture?
2. Once it is fulfilled, how do we keep the queried data up to date?

# Fulfilling Queries in a Local/Offline-First Architecture

Fulfilling queries hits another fork in the road. This decision is driven by your location in the state plane as well as by subjective design choices.

The problem is this:
1. Do you assume that your local state provides an authoritative answer, allowing the application to continue one the query is resolved locally?
2. Do you assume that your local state is not authoritative and you must receive a response from all peers before loading is complete?

Case (2) is, imo, only viable in client-server architectures and is the standard in online-first software or very small and highly available peer groups.

We'll move forward with choice (1). The immediate consequence of this is that all queries _must_ be reactive queries. If you've queried you local dataset and not waited for peers, you likely have incomplete data and can have data that flows in from peers later. Thus the query must be able to be subscribed to so the application can respond as new data arrives from peers.

E.g., in a react world this would look something like:
```jsx
function TaskList() {
  const todos = useLiveQuery(() => organization.queryTasks().whereAssignee(me));
  return <ol>{todos.map(t => <li>{t}</li>)}</ol>;
}
```

The `UX` would be such that the task list may initially be empty for a new client but slowly fill as peers weigh in with their state. Peer syncing status could potentially be surfaced but `UX` concerns are out of scope for this post.

The other consequence of choice (1) is that it lends itself nicely to a layered architecture.

**Thesis 4:** local/offline-first software should treat queries resolved by the local dataset as authoritative and allow the application to proceed rather than blocking and awaiting more data from peers. This requires reactive queries.

# Query Architecture -- Layering

Given we can assume that the local response is authoritative and allows the application to continue executing we can abstract away peer syncing details from the application layer.

![layering](./blog-assets/local-first-querying/layering.png)

1. The application layer issues queries to the local data layer.
2. The local data layer immediately fulfills the application's query with what is available
3. Local data layer gives a representation of the queries to the network layer
4. Networking layer subscribes to peers with those queries
5. Peers execute queries and fulfill them where possible

> (4) is another interesting design choice and is about how reactive we'd like to be. E.g., the queries can cease being reactive once they've received one set of updates from all peers or they can continue being reactive until the connection is terminated. We'll assume that the latter route is taken. The former is problematic from a perspective of staying up to date.

(4) & (5) get into fanout issues, whether or not the requesting node needs the data being returned or already has it.

> What about filters? Peers at different states will return different datasets and different orderings. We should presumably be able to resolve this on the node that receives the response by running merge algorithms?

Before answering those questions we need to detour into the duality of a query.

# Query Duality

Query duality? Wtf?

Queries have two natures.

Query vs node subscriptions

# Fanout

# What results to exclude? include? Versioning?
Versioning? Hasing of ids?

# Individual Node Subscriptions??

# Models -- authoritative sources