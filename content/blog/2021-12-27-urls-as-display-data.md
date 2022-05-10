---
slug: 2021-12-27-urls-as-display-data
title: 'URLs As Display Data'
tags: [software-engineering, framework]
---

I've been toying with the idea that we get something wrong when it comes to URL management and routing in [single page applications (SPAs)](https://developer.mozilla.org/en-US/docs/Glossary/SPA).

The current state of the art in SPAs is to let the URL (the route) drive application logic. We do this by binding UI components to paths. When the current path changes, the router switches out what UI components are visibile.

```jsx
<Routes>
  <Route path="/" element={<Layout />}>
    <Route index element={<Home />} />
    <Route path="about" element={<About />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="*" element={<NoMatch />} />
  </Route>
</Routes>
```

After developing a number of applications at [Meta](https://meta.com) with [React Router](https://reactrouter.com/) I'm starting to think that we have the whole thing backwards.

1. Binding application logic to routes introduces the URL as a source of state for your application. If your application also has a domain model, you begin to get two sources of truth for your state and two places that can influence what is displayed.
2. When the URL is acting as a source of truth for some part of your application state, creating routes from one part of the application to another introduces extra coupling between components that shouldn't know about one another. The coupling is introduced since the components must preserve aspects of the URL for one another.

# Alternative

What if we treated `window.location` as a _UI component_ to be **rendered from the state of our application** rathern than something that drives our application?

**Example:**

```jsx
function UrlRenderer({ appState }: { appState: AppState }) {
  useEffect(
    () =>
      window.history.pushState(
        {},
        '',
        `/${appState.editorMode}/${appState.deck.selectedSlide}`,
      ),
    [appState.editorMode, appState.deck.selectedSlide],
  );
  return null;
}

function App(appState) {
  return (
    <>
      <UrlRenderer appState={appState} />
      {appState.editorMode === 'slide' ? (
        <SlideEditor appState={appState} />
      ) : (
        <TransitionEditor appState={appState} />
      )}
    </>
  );
}

// Only at application startup do we read the URL then never again.
// All further interactions and display changes only happen via AppState.
const initialValues = decodeUrl();
const appState = new AppState(initialValues);

render(<App appState={appState} />, document.getElementById('app'));
```

This is the approach I've been taking as I re-write, re-design and overall modernize [strut.io](https://strut.io). I have to say that I like it very very much.

I no longer have to think any differently about the URL and handling route changes than I do for the rest of my application.

- Rendering the URL is the same as rendering a component.
- Handling a URL change in my app is the same as handling a state or prop change.

If I decide something that wasn't previously captured in the URL should now become persisted into the URL, I just update my `UrlRenderer` component and `decodeUrl` function -- everything else in my app remains unchanged.
