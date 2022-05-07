---

title: "Understanding Generics"
tags: [software-engineering]
---

```js
function identity<T>(x: T): T;
```

What is the essence of a generic?

> Generics are for the **caller** rather than for what is being called. They allow the **caller** to retain type information. To retain information about types given to what is called.

## Example - Identity

For the identity function, the generic serves no purpose for the called function. Identity could be typed as any, number, object, etc. It'd make no different to the implementation of identity.

```js
function identity(x: any): any {
  return x;
}

function identity(x: Object): Object {
  return x;
}
```
<!--truncate-->

The type makes a world of difference for the caller, however. Adding a generic type param to `identity` allows the caller to retain information about the type of the argument that was passed to identity.

```js
function identity<T>(x: T): T;

Math.abs(identity(-1));
```

This is true for all generic functions and classes. The caller uses the generic to pass through type information that it knows at the callsite and would like to make use of later.

## Example - Container

```js
class Container<T> {
  constructor(
    public readonly x: T,
  ) {}
}

function caller(n: number) {
  const c = new Container<number>(n);

  // Caller can use `abs` because it has retained
  // the type information about its parameter `n`
  // after putting it into container `c`
  Math.abs(c.x);
}
```

Caller can use `abs` because it has retained the type information about its parameter `n` after putting it into container `c`
