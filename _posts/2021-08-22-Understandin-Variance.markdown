---
layout: post
title: "Understanding Variance"
tags: programming generics variance
---

Covariance, contravariance, invariance and bivariance are concepts that govern the use of [generics]({% post_url 2021-08-22-Understanding-Generics %}).

What's wrong with the following code snippet?

```typescript
class Animal {}
class Cat extends Animal {
  purr() {}
}
class Cow extends Animal {
  moo() {}
}

const cats: Array<Cat> = [];

function barn(stock: Array<Animal>) {
  stock.push(new Cow());
}

barn(cats);
cats.map(c => c.purr());
```

The above [type checks fine](https://www.typescriptlang.org/play?#code/MYGwhgzhAECCB2BLAtmE0DeBfAUKSMAwmAC7QCmAHiefACYwIpqY7TvQAOArgE68AKAJSZcufFGiEA9gHcK1WgzhJU6DGw7Jp04aJy480+BDKUAXHH5gAngB5iJAHzQAvNADaAXQDcOHABm3PDAJIjG0ABGYLzwAqbSwADWlrDW9kxqTiIa7AnJAHQ8EAAWAvDk8jKywkJ+htGxApR1OJQFqJwCYG4uYEV8gkKtwMYQ0iDkBSDSAObNdUA) but contains a runtime error!

`barn` takes an array of animals and adds a `cow`. This is legal according to the type of the arguments of `barn` but not ok for the caller. The caller expects their array to only contain cats and not have any cows in it.

And this is why the concept of variance is so important. They allow us to ensure types stay sound in the face on inheritance and mutation.

## A Better Barn

To get the compiler to tell us about our mistake -- we can build a better barn.

```typescript
class Animal {}
class Cow extends Animal {
  moo() {}
}

function betterBarn<T extends Animal>(stock: Array<T>) {
  stock.push(new Cow());
}
```

This snippet [produces the following error](https://www.typescriptlang.org/play?#code/MYGwhgzhAECCB2BLAtmE0DeBfAUKSMAwgPYDu0ApgB4AuF8AJjAimpjtNMscQBQCUmXLhwAzAK7xgNRMXjQARhRp0ATgCEwq+AB4AKpVr0mcJKhAA+XhBrFgAawBccVarABPfRcEYO0G3b2AHQADuIQABa88BTkJKQC-ADcOFhAA):

```
Argument of type 'Cow' is not assignable to parameter of type 'T'.
  'Cow' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype of constraint 'Animal'.
```

The reason `Cow` can no longer be pushed onto the array is because `betterBarn` is  aware that the array it is dealing with could be typed as a subclass of `Animal` by its caller rather than as `Animal`.

Of course this now puts us in a new predicament. What if we had a function like:

```typescript
function idempotentBarn<T extends Animal>(stock: Array<T>): Array<T> {
  return stock;
}
```

Given this function does not mutate the `stock` parameter, we should be allowed to pass in any subtype of `Animal` without an error.

We could type `idempotentBarn` like so:

```typescript
function idempotentBarn(stock: Array<Animal>): Array<Animal>;
```

But that would cause the caller to lose type information.
