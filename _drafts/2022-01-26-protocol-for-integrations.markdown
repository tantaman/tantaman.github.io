---
layout: post
title: 'Thoughts on A Protocol For Integrations'
tags: software-engineering schema protocol
---

One of the things I did while working at Meta was to lay out a vision for and lead a team to enable products to be integrated into our human review, investigative analysis, legal disclosure, abuse protection, rules engines and feature extraction platforms with little to no code.

The guiding principle was to make data and actions available to all systems that needed them without developers having to do anything.

- New product gets developed? Rules (policies) can immediately be written against it.
- New content type added? Review/moderation tooling can automatically render it and enforce against it.
- New comment feature? Automatically enrolled in abuse protection systems.
- Etc.

Sounds too good to be true. How did we do it?

We started with a schema which evolved into a protocol built around a core set of concepts. To deploy the protocol without friction, we leveraged the parallels between schemas and static types and protocols and functions.

In other words, the system is broken down into four parts:

1. The Schema
2. The Protocol
3. The Concepts
   1. Semantic types / Everything is a type
   2. Actioning
   3. Promoting edges to a first class type
   4. Dropping objects
   5. Isomorphs
4. Deployment
   1. Schemas as a parallel to the type system
   2. Protocol specification as a parallel to functions

# The Schema

Schemas are what make data interpretable by programs. If I hand a service a binary blob, with no schema that describes it, then the service can't do anything with it. It doesn't know how to decode that blob.

When you pair the blob with the schema (e.g., struct) the service can do interesting things such as:
- Tell you what fields exists in the blob
- Tell you the types of the fields
- Tell you the names of the fields
- Tell you how many fields there are
- Tell you what fields are missing
- Retrieve the values of those fields

There are some formats that are "self describing" and don't necessarilly need a schema. E.g., JSON.

```json
// foo.json
{
  "name": "Howard Plumber",
  "address": {
    "city": "Wayward",
    "street": "321 Plane",
    "zip": 24442,
    "state": "VA",
    "last_update": 2304123894
  }
}
```

The problem with JSON, however, is that there is nothing to tell you what the fields mean beyond their primitive types and names.

> Is the above struct a personal name and address or business name and address?
> Should the program interpret anything named "state" as a US state?
> Is "last_update" a time? Is it in seconds? milliseconds? minutes? something else?

Nor does JSON tell you what fields might be missing.

So schemas, in addition to telling you what _is_ there, also tell you about what _could_ be there. Schemas also tell you how to interpret what is there. E.g., is this pairing of name and address a business address or personal address or how "last_update" should be parsed.

The first step was to schematize everything and to schematize it well.

## Schematize Everything

How do you schematize everything in a [100+ million line codebase](https://www.wired.com/story/facebook-zoncolan-static-analysis-tool/)? If your codebase is statically typed, you're nearly there already.

Static types and schemas are one and the same thing. We leveraged this fact and developed a set of annotations developers could apply to their classes, methods and fields to expose them to the various services that were mentioned. This should be fairly familiar to anyone who has worked with a technology like Hibernate and their [annotation driven config](https://www.journaldev.com/17803/jpa-hibernate-annotations).

```
@Expose
class Foo {
  @ID
  public function getId(): ID_of<Foo> {...}
  @Field('description...', ...)
  public function getThing(): string {...}
}
```

Of course we can't stop here. If we did, we wouldn't be much better than something like JSON. Yea, this lets us package an object up and decode an object, but it lacks the ability to do many important things like:
1. Provide clients with a copy of the schema
2. Request and load arbitrary objects
3. Traverse edges between obejcts
4. Run actions to update objects
5. Extend or enrich object definitions of other products without modifying those products
6. Understand the semantic meaning of types



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