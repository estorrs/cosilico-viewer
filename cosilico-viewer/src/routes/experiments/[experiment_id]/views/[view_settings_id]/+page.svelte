<script>
  import ZarrTileViewer from "$lib/ZarrTileViewer.svelte";
  import { initZarr } from "$lib/openlayers/ZarrHelpers.js";

	// let { experiment, view_settings } = $props();
	let { data } = $props();
	let { experiment, view_settings } = $derived(data);

	$effect(() => {
		console.log(experiment);
		console.log(view_settings);

    let x = initZarr('https://nyc3.digitaloceanspaces.com/test-experiments-1/test-experiments-1/14987b7ded264f0c8155725648d05fb0.zarr.zip?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=DO00TUCMZUK63DKA37DA%2F20250613%2Fnyc3%2Fs3%2Faws4_request&X-Amz-Date=20250613T161137Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=a2689390ea4e2daa008ff7e8f10360703a6853835d288faf533e0a96ada5b0ba');
    console.log(x);


	});
</script>

{#if experiment}
  <!-- <ZarrTileViewer
    experimentObj={experiment}
    /> -->
{/if}


