---
slug: 2021-12-15-React-Anemic-Models
title: 'Reacting Better. Intro: Anemic Models'
tags: [software-engineering, react]
---

[React](https://reactjs.org/) eschews models that have any attached functionality. The “model” for a react app is usually [anemic](https://martinfowler.com/bliki/AnemicDomainModel.html) — just a bare set of properties with no methods attached.

```typescript
type Slide = {
  selected: boolean;
  embeds: Embed[];
  text: string;
};

type Embed = {
  src: URI;
  top: number;
  left: number;
};
```

This is exacerbated, or even further codified, by [Relay](https://relay.dev/) and [GraphQL](https://graphql.org/) where you fetch properties from the server and render them directly (note: Relay and GraphQL are truly revolutionary and amazing technologies by allowing data fetching to be declarative and driven by the client).

If you need to perform operations against your data, you’d just call plain old functions to do that.

```typescript
function Slide(props: Slide): ReactNode {
  const videos = pullVideos(props.embeds);
  ...
}
```

**Let me pause here** and say that this is often all you need for your app. I’ve built apps in the hundreds of thousands of lines that were worked on by dozens of developers, all with anemic models and it worked great. [YAGNI](https://en.wikipedia.org/wiki/You_aren%27t_gonna_need_it).

When, however, do anemic models become a problem? A few things have to start to be true:

1. Most of the logic for mutating your model lives client side rather than server side
2. You have many models which need to vary their behavior according to some type information. This usually manifests when your anemic models start to carry `type` or `__type` fields in them and you use that to alter behavior in functions.
3. Your model is open for extension by others

Here’s an example where an anemic model could star to become problematic — when we want to start extending our presentation builder with new types of slides.

```typescript
type Slide =
  | {
      type: 'markdown_slide';
      selected: boolean;
      text: string;
    }
  | {
      type: 'standard_slide';
      embed: Embed;
      text: TextBox[];
    };

function pullVideos(s: Slide) {
  switch (s.type) {
    case 'markdown_slide':
      return pullVideosFromMarkdown(s);
    case 'standard_slide':
      return s.embeds.filter((e) => e.type === 'video');
  }
}
```

Of course we can add new types of slides, get compile errors because the switches are not exhaustive and then open the functions up to decide what to add or move to a default case.

This lack of colocation of functionality for new types can be problematic when it comes to organizing your code and especially when it comes to allowing third parties to extend your code — they’ll need to modify your core functions. The common [expression problem](https://en.wikipedia.org/wiki/Expression_problem).

You could of course get more clever and write “type function providers” that allows third party extensions without modifying existing code as well as co-locating functions with type names. E.g.,

```typescript
provideFunctionsForType('markdown_slide', {
  pullVideos(s: MarkdownSlide) {
    ...
  }
  renderText(s: MarkdownSlide) {
    ...
  }
});
```

but at this point, aren’t you just re-inventing classes?

And how would you **even introduce a domain model** / classes with with behavior into a React app? Where in the React world we expect all of our props to be **immutable** and classes are often **contrary** to that concept. Even further — how do you **hydrate** such a model when using libraries like Relay to pull data?

The first thing we need to address is immutability. How do we make a domain model which is immutable or, for all appearances, has the properties of being immutable?

To do that, we need to address [Missing Mutation Primitives]({% post_url 2021-12-16-Missing-Mutation-Primitives %}).
