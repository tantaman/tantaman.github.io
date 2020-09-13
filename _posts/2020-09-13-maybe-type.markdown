---
layout: post
title: 'Option / Maybe<$500,000,000>'
categories: software design api-design oo functional algebraic-types
---

This is a re-hash of portions of Rich Hickey's talk here: https://www.youtube.com/watch?v=YR5WdGrpoug

I'm writing it down as I've had to explain this argument a few times and this format is easier to consumer than a hour long video.


---
I'm sure everyone has heard this from [Tony Hoare](https://en.wikipedia.org/wiki/Tony_Hoare):

> I call it my billion-dollar mistake. It was the invention of the null reference in 1965.

And languages and users have gone about trying to solve this billion dollar mistake. However, one of those solutions (the `Option` / `Maybe` type) while not as bad as null references is still a 500 million dollar mistake.

### Starting at the beginning

There are 3 ways of handling nullability:

**First:** the billion dollar mistake. A reference can be null but this fact is not encoded in the type system.

This is what Java does. Anytime you receive a pointer to something you don't know whether or not it is pointing to an actual object or null.

```java
string foo(String x) {
  // this might work or it might throw a null pointer exception
  return x.substring(0, 1);
}

// both of these invocations are allowed by the compiler
// however one will fail at runtime.
foo(null);
foo("xyz");
```

**Second:** Null references exist but the type system understands that fact and forces the programmer to specify when null is expected and when it is not expected.

This is how TypeScript handles null.

```javascript
function foo(x: string): string {
    return x.substr(0, 2);
}


foo(null); // You cannot write this in TypeScript as x was not declared as being nullable.
foo("sdf"); // works fine

function relaxedFoo(x?: string): string {
  if (x != null) // compiler forces you to check for null
    return x.substr(0, 1);
  return '';
}

relaxedFoo(null); // works fine. We indicated to the compiler that relaxedFoo can handle null references
```

**Third**:

The `Option`/ `Maybe` type. This "removes" null altogether. The easiest way to think about this is that rather than having a thing that is null or not null, now you have a collection that is empty or not empty. `Option` has already been discussed at great length in the other answers here.

## `Option` -- the 500 million dollar mistake

So what is so bad about `Option` that I'd spend an hour on Sunday morning writing about it?

It has to do with program maintenance.

### Providing Stronger Guarantees

Take a look at the following code:

```
function bar(x: string): Option<string> {...}

let y = bar('sdf');
if (y.isEmpty()) {
  console.log('No result!');
} else {
  console.log(y);
}
```

Looks good. Bar expresses that it may or may not return a string. Callers of bar are forced to handle both cases -- when a string is returned and when a string is not. And better yet, the compiler forces us to do this checking since `Option` is part of the type system.

This code gets released into the wild and tons of people are calling `bar`. Great success.

Now, as the author of `bar`, I want to provide a **stronger guarantee** to my users. I can now guarantee that `bar` will **always** return a string in all cases.

```
function bar(x: string): string;
```

Shit. Well what just happened to all of the callers of `bar`? They BROKE! They no longer compile because I'm returning string rather than `Option<string>`.

However, if the language understood nullable types we wouldn't have this problem.

```
function bar(x: string): ?string;

let y = bar('sdf');
if (y != null) {
  console.log('No result!');
} else {
  console.log(y);
}
```

`?string` has all the safety as `Option` but when changing `?string` to `string` in a return type, **we do not break any callers**. Everything continues to work as expected.

Now lets look at the reverse.

### Relaxing Requirements

This same problem occurs when taking in arguments to a function.

```
function foo(x: string): string {...}
```

`foo` requires all callers to always pass a string. But what if tomorrow I want to relax that constraint? Callers can call me with a string or without.

If I used `Option` I'd end up here:

```
function foo(x: Option<string>): string {...}
```

which breaks all callers as `Option<string>` in not compatible with `string`.

However, this isn't an issue in TypeScript and other languages that understand null. In those languages I would do:

```
function foo(x: ?string): string {...}
```

`?string` is a supertype of `string` and thus no existing callers break. I can release an update to my library and not break any of its consumers.



(this is also a problem of the rust error type. If I no longer return errors from a function I've broken callers that were handling errors)