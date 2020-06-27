---
layout: post
title:  "These are not types"
categories: programming software development types language design thinking
---

Is an **int** a type? A **float**? A **double**?

These are **storage** types, not **application level** types.

For many software projects, `int`, `float`, `double`, `string`, etc. exist at the wrong level of abstraction to be conidered proper data types. They represent how information is encoded by storage rather than something that an application should deal with.

As an example, if you're reviewing the code of an application, what does the type `int` tell you? That `int` could be:
1. a timestamp
2. a count
3. a measurement
4. an ID
5. a phone number
6. ...

An application exists several levels of abstraction above raw storage and so raw storage types are mostly meaningless in the application context. Even in the list above which refines the integer type, those types can still be refined further.

### ID Type

The most obvious yet non-obvious example is the ID type. IDs are _of_ things rather than being the things themselves. An ID type should thus express what the ID is of.

E.g., ID of User, ID of Post, ID of Comment.

Leading to method signatures like:

```
getPosts(id: ID<User>): List<ID<Post>>;
getComments(id: ID<Post>): List<ID<Comment>>;
```

Which is much more expressive than:

```
getPosts(id: int): List<int>;
getComments(id: int): List<int>;
```

## For another day:

* A new issue here is the `List` type. It is completely the wrong type to use to represent potentially unbounded collections.
* Counts, measurements, phone numbers, etc. can all be refined futher and further. And even more so once you start to consider data flow, policy and legal restrictions that should be factored into data types.
* Invariants. Invariants are a symptom of poor types.