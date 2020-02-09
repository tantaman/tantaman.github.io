<script>
  import { Router, Route } from "svelte-routing";
  import Home from "./Home.svelte";
  import Nav from "./Nav.svelte";
  import ProceduarlBG from "./ProceduralBG.svelte";

  export let url = "";
</script>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>

<main>
  <h1>Tantamanlands</h1>
  <Nav />
  <ProceduarlBG />
  <Router {url}>
    <Route path="/">
      <Home />
    </Route>
  </Router>
</main>
