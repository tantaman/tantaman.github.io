---
layout: post
title: 'Reacting Better - Deeply Nested Updates'
tags: software-engineering react
---

Something irks me about [React](https://reactjs.org/). It's how inefficiently it handles deeply nested updates.

React apps, like any app, will have a display hierarchy of deeply nested components. The root component being the entrypoint of the app, the leaves being the individual buttons, table rows and text rendered by the app.

**Lets look at an example**

Let's take a presentation editor (e.g., powerpoint / keynote or [strut.io](https://strut.io)) as an example.

The component hierarchy might look something like:

{% include image.html url="/assets/posts/deeply-nested-updates/deeply-nested.png" description="App Components" %}

Which, in code, looks like:

```tsx
function App({ appState }) {
  return (
    <Editor>
      <Header>
        <StylingButtons authoringState={appState.authoringState} />
      </Header>
      <SlideWell deck={appState.deck} />
      <SlideEditor
        slide={appState.deck.currentlySelectedSlide}
        authoringState={appState.authoringState}
      />
    </Editor>
  );
}

function StylingButtons({ authoringState }) {
  return (
    <div>
      <ParagraphStyle blockState={authoringState.blockState} />
      <InlineStyle authoringState={authoringState} />
    </div>
  );
}

function ParagraphStyle({ blockState }) {
  return (
    <ButtonGroup>
      {blockTypes.map((type) => (
        <BlockOption
          type={type}
          selected={blockState.isSelected(type)}
          onClick={() => blockState.apply(type)}
        />
      ))}
    </ButtonGroup>
  );
}

function SlideEditor({ authoringState }) {
  return (
    <div>
      ...
      <MarkdownEditor
        blockState={authoringState.blockState}
        inlineState={authoringState.inlineState}
      />
      ...
    </div>
  );
}
```

The corresponding application state structure thus looks like:

```
appState {
  authoringState {
    blockState
    inlineState
  }
  deck {
    currentlySelectedSlide
  }
}
```

<br/>

# Updates

All is well and good until we want to update our application's state.

If `appState` is immutable, an update to a deeply nested property like `blockState` will cause a re-render cycle across our entire app.

`App` will get re-render due to it receiving a new `appState` reference. The `App` render method will visit `Header` which re-renders. `Header` re-renders since its child `StylingButtons` re-renders. `StylingButtons` re-renders since its child `ParagraphStyle` re-renders. `ParagraphStyle` re-renders since its children `BlockOptions` actually change. Similar pattern goes for `SlideEditor` and `MarkdownEditor`.

We only wanted to re-render the leaves -- `BlockOptions` and `MarkdownEditor` but we ended up re-rendering the entire component graph.

{% include image.html url="/assets/posts/deeply-nested-updates/deeply-nested-re-render.png" description="Everything in <font color='red'>red</font> re-renders, but we only needed to re-render the stuff in <font color='blue'>blue</font>" %}

# What Do?

We need a different model for React components to subscribe to application state and for those state updates to propagate through the app, without sacraficing the pros of the [unidirectional data flow of react](https://reactjs.org/docs/thinking-in-react.html).

To do that I've built out a [React Hook](https://reactjs.org/docs/hooks-intro.html) framework based on the work outlined in [Missing Mutation Primitives]({% post_url 2021-12-16-Missing-Mutation-Primitives %}) and [Understanding Reference Equality]({% post_url 2021-12-17-Object-Identity %}).

I'll be introducing and publishing this framework in a follow up post in the next week.

<!-- TODO next post -->
