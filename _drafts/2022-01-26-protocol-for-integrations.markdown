---
layout: post
title: 'Thoughts on A Protocol For Integrations'
tags: software-engineering schema protocol
---

One of the things I did while working at Meta was to lay out a vision for and lead a team to enable products to be integrated into our human review, investigative analysis, legal disclosure, download your information, abuse protection, rules engines and feature extraction platforms with little to no code.

The guiding principle was to make data, and actions, available to all systems that need them without developers having to do anything.

- New product gets developed? Rules (policies) can immediately be written against it.
- New content type added? Review/moderation tooling can automatically render it and enforce against it.
- New comment feature? Automatically enrolled in abuse protection systems.
- Etc.

Sounds too good to be true. How did we do it?

We started with a schema which evolved into a protocol that expressed a set of concepts. To deploy the protocol without friction, we built on the parallels between schemas and static type systems and protocols and functions.

1. The Schema
2. The Protocol
3. The Concepts
   1. Semantic types / Everything is a type
   2. Actioning
   3. Promoting edges to a first class type
   4. Dropping objects
   5. Isomorphs
4. Deployment
   1. Schemas as a parallel to the type system - Annotations


# The Schema

Schemas are what make data interpretable by programs. If I hand a service a blob of binary with no schema that describes it then the service can't do anything with it.

If a program has access to both the schema and the data it can do interesting things such as:
- Tell you what different fields mean
- Tell you how many fields exists and their names
- Get the values of those fields for you

JSON is in some sense a self-describing data format. I can hand a service a blob of JSON and, if it knows its JSON, it can decode it and tell you most of the things above about it.

```
```

What it can't tell you, however, is what the fields means. Nor what constraints exist on the fields or what might be missing.

So schemas, in addition to telling you what _is_ there, also tell you about what _could_ be there and how what is there is meant to be interpreted. E.g., is this pairing of name and address a business address or personal address?

What new protocol definitions did IObjs bring?

1. `iobj` query to load a thing from id
2. `search` query to search based on type
3. `schema` query to serve the schema
4. `connection / edge` definition ala [Relay](https://relay.dev/graphql/connections.htm)
5. Standardized filtering
   1. For things with a primitive representation
6. Serving of what filters are available for X type
7. Extending types without modifying types
   1. And getting data from the isomporph
8. Semantic types
9. Integrity value? Values are things... that can connect to other things thru logical transformation...
   1. Date, name, zip, email, domain, etc....
10. Integrity event... is discrete. The like vs the act of liking and when it was liked.
    1. IP address record vs the IP itself
       1. Add the event to the graph or the underlying thing? Link on event or piece of the event?
11. `Isomorphs`