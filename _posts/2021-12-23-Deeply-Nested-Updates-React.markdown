---
layout: post
title: 'Reacting Better - Deeply Nested Update Problem'
tags: software-engineering react framework
---

Something irks me about React. It's how [inefficiently it handles deeply nested updates](https://youtu.be/AdNJ3fydeao).

React apps, like any app, will have a display hierarchy of deeply nested components. The root component being the entrypoint of the app, the leaves being the individual buttons, table rows and text rendered by the app.

**Example**

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

We need a different model for `React` components to subscribe to application state and for those state updates to propagate through the app, without sacraficing the pros of the [unidirectional data flow of react](https://reactjs.org/docs/thinking-in-react.html).

To do this we need to distinguish between _nominal_ and _physical_ identity in software.

**Nominal** identity is like a proper name. Proper names hold over time, no matter how the **physical** characteristics of the named thing changes.

**E.g.,** We always recognize that the **Nile** refers to the **Nile** river, even though at every instant the physical makeup of the **Nile** is changing. This is the case because nominal identities get their meaning from causal links over time rather than physical composition at snapshots in time. See [Understanding Reference Equality]({% post_url 2021-12-17-Object-Identity %}) for more discussion.

For our specific use case, adding and removing slides from a slide deck does not change the nominal identity of the deck. It's still the same deck, just with a longer causal chain of events attached to it. More concretely, if I make a presentation on Apes called _"Matt's Ape Presentation"_ and remove a slide or fix up spelling mistakes, it is still _"Matt's Ape Presentation."_

It might sound like I'm suggesting a regression back to mutable data structures and all the complications that that entails. In some ways yes, in other ways no. I think we can have the best of both worlds:

1. Nominal identities rooted in causal links and refer to things that change over time
2. Physical identities that refer to immutable snapshots in time.

> The current state software engineering is in is a false dichotomy between immutable & functional vs mutable & oo. I explore this more in [Missing Mutation Primitives]({% post_url 2021-12-16-Missing-Mutation-Primitives %}) as well as [Understanding Reference Equality]({% post_url 2021-12-17-Object-Identity %}).

If we introduce the concept of nominal identity into our example, certain references in our state tree would be nominal references. If something in `AuthoringState` changes, the nominal reference to `AuthoringState` from `AppState` would not change. If `slides` are added to a `Deck`, the nominal reference to `Deck` from `AppState` would not change.

Further, `AppState` would never change nominally. It would be constant for the lifetime of the user's session. `AuthoringState` would be nominally constant so long as the user does not load a new `Deck`. `blockState` would change nominally every time we reference a different block element within the slide. E.g., new paragraph, header, quote, etc. block.

The stability of these references would allow us to only render the components whose data actually changed.

# Integrating It

To integrate these concepts, `React` components need to understand whether they depend on something nominally or physically.

If a component depends on something nominally, this means that the component does not re-render if the physical structure or makeup of the thing it depends on changes. The component would only re-render if the nominal identity of its dependency changes. E.g., my "Ape Presentation" is replaced by my "Zebra Presentation."

If a component depends on something physically, this means that the component re-renders any time any bit of that thing changes. E.g., a letter in a string that is rendered by a text box changes.

I've not discussed physical identity in detail but pysical identity means that the physical attributes must match excatly for two things to be the same. A single nominal identity (e.g., a river or the ship of Theseus) can have an infinite number of physical identities over its lifetime. Things get interesting when you have physical things which contain nominal references and this needs to be explored further as to whether or not this relationship should be allowed. Nominal things containing physical things is intuitive and well defined.

# Framework

I've built out a [React Hook](https://reactjs.org/docs/hooks-intro.html) framework, based on the work outlined here, which I'll be publishing in the following week.

<!-- TODO next post -->
