---
slug: 2022-01-17-why-fetching-earliy-is-difficult-to-express
title: 'Expressing Early Fetches - React'
tags: [software-engineering, react]
---

draft post--

Fetching early is difficult to express and get right in all places in React.

This is because a lack of domain models. That everything is anemic. That we've moved business logic into display.

Render-as-you-fetch rather than fetch-before-render is the more natural way in React. The rendered thing won't miss any fetches in render-as-you-fetch.

But in fetch-before-render, you could miss fetch kickoffs. E.g., on click, on tap, on keydown, on drop, on push state ... could all be different entrypoints to the same view which requires the same fetch kickoffs. But maybe you miss adding the fetch in one of those entrypoints.

How can we express this relationship such that each event that leads to the view doesn't have to start the fetch? Or that they're all guaranteed to start the same required fetches?

```typescript
<button onClick={() => {
  const nextUserId = getNextId(resource.userId);
  // Next fetch: when the user clicks
  setResource(fetchProfileData(nextUserId));
}}>
```

reference: https://reactjs.org/docs/concurrent-mode-suspense.html
