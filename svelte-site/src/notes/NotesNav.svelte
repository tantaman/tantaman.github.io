<script>
  export let index;

  const files = Object.keys(index);
</script>

<ul>
  {#each files as file}
    {#if typeof file === 'object'}
      <svelte:self index={file} />
    {:else}
      <li>{file}</li>
    {/if}
  {/each}
</ul>
