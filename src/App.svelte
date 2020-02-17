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
    padding: 0;
    margin: 0;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
    margin-bottom: 0;
    margin-top: 0;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }

  .header {
    border-bottom: 12px solid #ffa500;
  }
</style>

<main>
  <div class="header">
    <h1>Tantamanlands</h1>
    <Nav />
  </div>
  <ProceduarlBG />
  <Router {url}>
    <Route path="/">
      <Home />
    </Route>
  </Router>
</main>
