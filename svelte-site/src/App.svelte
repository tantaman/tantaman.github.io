<script>
  import { Router, Route } from "svelte-routing";
  import Home from "./Home.svelte";

  export let url = "";
</script>

<Router {url}>
  <Route path="/">
    <Home />
  </Route>
</Router>
