<script>
  import ZarrTileViewer from "$lib/ZarrTileViewer.svelte";
  import { initZarr } from "$lib/openlayers/ZarrHelpers.js";
  import { onMount } from "svelte";

	// let { experiment, view_settings } = $props();
	let { data } = $props();
	let { experiment, supabase } = $derived(data);



</script>

{#if experiment}

  <div class='h-screen'>
  <ZarrTileViewer
    experimentObj={experiment}
    {supabase}
  />
  </div>

{/if}



