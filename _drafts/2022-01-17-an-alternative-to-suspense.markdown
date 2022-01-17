---
layout: post
title: 'An Alternative to React Suspense'
tags: software-engineering react
---

[React Suspense](https://reactjs.org/docs/concurrent-mode-suspense.html) is a nice little feature to deal with asynchronous data fetches when rendering an application. It lets you write your code almost nearly as if all of the data for your application was already available on the client.

```typescript
function ProfilePage() {
  return (
    <Suspense fallback={<h1>Loading profile...</h1>}>
      <ProfileDetails />
      <OtherPageComponents... />
    </Suspense>
  );
}

function ProfileDetails() {
  const user = resource.user.read();
  return <h1>{user.name}</h1>;
}
```

When using `suspense`, the above is a valid way to write React code even if `resources.user.read()` is still waiting on data to be returned from the data provider.

If `resource.user.read()` is still pending, the `fallback` element (Loading profile...) will be rendered instead of `ProfileDetails`.

Under the hood, this is implemented by `resource.user.read()` throwing an exception if it is still waiting for the data to be returned. The `Suspense` component catches the exception and, if the exception is a promise instead of an error, it subscribes to the promise and renders the fallback component. When the promise resolves, `Suspense` is notified and renders `ProfileDetails` instead of the fallback.

We can even fix the hidden dependencies issue by handling the details of suspending in `ProfileDetails`:

```typescript
function ProfileDetails() {
  const user = resource.user.read();
  return <h1>{user.name}</h1>;
}

function ProfileDetailsWithSuspense() {
  return (
    <Suspense fallback={<h1>Loading profile...</h1>}>
      <ProfileDetails />
    </Suspense>
  );
}
```

although maybe one day TypeScript will have coeffects so we can encode dependencies on globals like this into the type system -- http://tomasp.net/coeffects/.

There are alternatives to suspense in user space.

# User Space Alternatives

## `usePromise` hook --

```typescript
usePromise(promise) {
  const [resolution, setResolution] = useState();
  useEffect(
    () => {
      let ignore = false;
      promise.then(
        (r) => {
          !ignore && setResolution({type: 'success', result: r});
        },
        (e) => {
          !ignore && setResolution({type: 'error', result: e});
        },
      );
      return () => {
        // fix race conditions
        ignore = true;
      };
    },
    [promise],
  );

  if (resolution.type === 'error') {
    throw new Error(resolution.result);
  }

  return resolution.result;
}

function ProfileDetails() {
  const user = usePromise(resource.user.read());
  if (user == null) {
    return <h1>Loading profile...</h1>;
  }
  return <h1>{user.name}</h1>;
}
```

# Crank.js

Crank.js takes a different tack from React and relies entirely on JavaScript control flow primtives. In other words, if your component does an async operation like data fetching all it needs to do is define itself as an async function.

https://crank.js.org/
