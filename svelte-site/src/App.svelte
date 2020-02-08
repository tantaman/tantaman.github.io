<script>
  import { Router, Route } from "svelte-routing";
  import Home from "./Home.svelte";
  import ProceduarlBG from "./ProceduralBG.svelte";

  export let url = "";
</script>

<ProceduarlBG />
<Router {url}>
  <Route path="/">
    <Home />
  </Route>
</Router>
