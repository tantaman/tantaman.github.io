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

We started with a schema which evolved into a protocol that expressed a core set of concepts for interacting with data.

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
  @Field
  public function getId(): ID_of<Foo> {...}
  @Field('image', ...)
  public function getImageURL(): URL {...}
}
```

Of course we can't stop here. If we did, we wouldn't be much better than something like JSON or Thrift. Yeah, this lets us package an object and ship it over the wire but the receiver can't do much with it.

* If you have a rules engine and you want to load objects, the schema doesn't tell you how to do that.
* If you have a content moderation tool and you want to render user reported content for review, this schema doesn't provide enough meaningful semantic information to do that. E.g., does a URL represent an image? A video? A blob?
* If you have an abuse protection system (e.g., ant-spam), how do you know what parts of the object contain user controlled information?
* If your abuse protection system wants to action an object (and all connected objects), how would it do that?

All that to say, a simple schema like this isn't very useful. We need to evolve the schema and upgrade it to a protocol that enables client services to:

1. Understand what represents the primary key for an object
2. Understand when a field can be parameterized and what those parameters are
3. Understand when a field represents an edge
4. Understand the semantic meaning of types (e.g., what _is_ this string or int)
5. Understand what actions exist for a given type
6. Extend or enrich definitions of other schemas without modifying those schemas
7. Unify equivalent types
8. Request and load arbitrary objects
9. Traverse edges between objects
10. Invoke methods on objects
11. Run actions agains objects
12. Request a machine readable copy of the schema, and protocol, to understand the scope of the universe
13. Request a subset of fields from an object

> **Note:** for those who have used `GraphQL` this should look somewhat familiar. Given `GraphQL` and `Relay` are both developed by Meta, we took a lot of inspiration from their approaches. Our protocol even has a very tight `GraphQL` integration. We diverge, however, in a few places. We allow users to extend one another's types (think of [Rust's trait system](https://doc.rust-lang.org/book/ch10-02-traits.html)), we heavily encourage the use of semantic type aliases, we have no "terminal" types, we've further defined edge traversals and edge operations (similar to [Relay Connections](https://relay.dev/graphql/connections.htm)), we provide more primitives for introspection, we retain the ["node" and "nodes" root calls concepts](https://github.com/facebook/relay/issues/1653), we add support for type equivalences.


# Evolving the Schema

Of the 13 items above, the first 7 require a more expressive schema.

(1) is pretty simple -- we can add an `@ID` annotation which can be applied to a field or method. Useful on a method for the cases where the id is a compound id.

```typescript
@Expose
class Foo {
  @ID('id')
  public getId(): ID_of<Foo> {...}
}
```

generates the following notional schema:

```javascript
FooSchema = {
  meta: {
    type: "Foo",
    primaryKey: "id",
  },
  fields: {
    id: ID_of(Foo)
  }
}
```

(2) is straightforward as well. Just update the script that processes static types and annotations to ingest the parameters of annotated methods and encode them into the schema.

As an example, applying (2) to

```typescript
@Expose
class Foo {
  @Field('image')
  public getImageURL(d?: Dimensions): URL {...}
}
```

generates

```typescript
FooSchema = {
  meta: {
    type: "Foo"
  },
  fields: {
    image: {
      args: [optional(Dimensions)],
      ret: type_reference(URL)
    }
  }
}
```

> Note: the generated schema is a struct that is easily consumable by a machine.

(3-7) are more involved as they're new ideas.

## (3) Field or Edge?

Our schema needs to tell us if something is a field or an edge. This is important because edges represent potentially unbounded connections between objects. E.g., the list of all fans of a page. This could be in the millions and you wouldn't want to retrieve all of them at once.

Edges can also be filtered, paged over, or combined with other edges (we'll get to this in the protocol section).

So how do we tell our schema that something is an edge? Luckily in our codebase this idea is already well expressed. Whenever an object has an edge to another, it returns a `Query` type rather than a raw collection. Raw collections are almost never what you want for these relationships -- nomatter their size -- as collections are the wrong abstraction to model an edge (for a different post). We let the developer still use the `@Field` annotation and infer for them, based on return type, that the thing is an edge.

Example:
```typescript
@Expose
class Foo {
  @Field('history')
  public function queryHistory(): HistoryQuery { ... }
}
```

generates:

```typescript
FooSchmea = {
  meta: {
    type: "Foo"
  },
  edges: {
    history: {
      // all edges support a specific set of arguments
      // covered in the `protocol` section 
      args: {
        first: int,
        last: int,
        after: Cursor
      },
      edge: {
        cursor: Cursor,
        node: type_reference(History),
        data: null // Edges can have data about the relationship. Not covered.
      },
      count: int
    }
  }
}
```

## (4) Semantic Types

If you remember, the other not so useful thing about our schema was when fields returned "string" or "int" or other "storage" types (see [These are Not Types]({% post_url 2020-05-19-These-Are-Not-Types %})). What does the string represent? An email? A domain? A date?

To be useful to services we must provide hints about the meaning of the string. Some schemas decide to go with "format" properties. I think this is the wrong direction. Format is an encoding concern rather than a meaning concern.

What we did was to encourage developers to use semantic type alises in their code. So instead of returning "string" return "EmailString."

Example aliases:

```typescript
type EmailString = string;
type DomainString = string;
type URLString = string;
type Timestamp = int;
type Month = int;
type Measure<T as Unit> = double;
type ID<T> = int | string;
type Unit = 's' | 'ms' | 'm' | ...;
...
```

And our schema generator would parse out these semantic types and encode the information they conveted into the schema.

Example:

```typescript
@Expose
class Foo {
  @Field('length')
  public getLength(): Measure<'m'> { ... }
}
```

generates:

```typescript
FooSchema = {
  meta: {
    type: "Foo"
  },
  fields: {
    length: type_reference(Measure)
  }
}

Meausre = {
  meta: {
    type: "Measure",
  },
  // We'll get into why `Measure` is a type with fields
  // rather than just a value later
  fields: {
    value: double,
    unit: type_reference(Unit)
  }
}
```

Now a service that receives this can actually do something! It can plot something meaningful on a map or chart. It can show a visual, it can compare the length to lengths of other objects in the system. All by simply adding a little type information.

This extends to other things like "email." When a system receives a string that it _knows_ is an email address, it can do things with it. It can check block lists, check dkim keys, pull the domain and check registrant information. All very important things for an abuse protection system to do.

You could argue that the system receiving a string can pattern match against it to try to understand _what_ it is. That doesn't work so well with things that overlap -- such as user ids, phone numbers and time stamps. They're all overlapping sets of ints.

## (5) Actions

We've come a long way. With these updates to the schema, systems can be built to create meningful visualizations from the data received, graph relationships between types, pull features for use in classification, detect abusive content and more.

Wouldn't it be great, however, if the client service could provide some sort of feedback? E.g., if an abuse protection system could block actions, delete harmful posts, and log-out compromised users based on the data it received from a product?

To do that we need to schematize what actions are available.



## (6) Type Extension
## (7) Type Equivalence

The remaining 6 items define the protocol.

# The Protocol

Where the schema defines the data format the protocol defines how to interact with the data. How to fetch it, change it, interrogate it.


---

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