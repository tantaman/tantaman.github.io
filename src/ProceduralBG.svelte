<script>
  import { onMount } from "svelte";
  let canvas;

  onMount(() => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // bind to scroll events so we know what we should be drawing onto the canvas (i.e. what the x pos is)
  });
</script>

<style>
  canvas {
    position: fixed;
    top: 0;
    left: 0;
  }
</style>

<canvas bind:this={canvas} />
