<script>
  import { onMount } from 'svelte';
  import Map from 'ol/Map';
  import View from 'ol/View';
  import TileLayer from 'ol/layer/Tile';
  import { get as getProjection, Projection } from 'ol/proj';
  import { ScaleLine } from 'ol/control';
  import TileGrid from 'ol/tilegrid/TileGrid';
  import ZarrTileSource from './ZarrTileSource';
  // import ZarrTileSource from '$lib/zarr/ZarrTileSource.js'; // Try with .js extension



  // Image metadata
  let fullImageWidth = 5000;  // Example: full resolution width in pixels
  let fullImageHeight = 8000;  // Example: full resolution height in pixels
  let micronsPerPixel = 0.2125; // Microns per pixel at full resolution

  let tIndex = $state(0);
  let cIndices = $state([0]);
  let zIndex = $state(0);
  // let resolutions = $state([512, 1024, 2048, 4096, 8192, 16384, 32768, 65536]);
  let resolutions = [8192, 4096, 2048, 1024, 512];
  let url = 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/image_small.zarr.zip';

  let map;
  let zarrSource;
  let scaleControl;

  // Define a projection where 1 pixel = 1 coordinate unit
  const pixelProjection = new Projection({
    code: 'PIXEL',
    units: 'pixels',
    extent: [0, 0, fullImageWidth, fullImageHeight], // Define the image space
  });

  // Function to create the map and tile source
  function createMap() {
    console.log("Creating new ZarrTileSource with indices:", { tIndex, cIndices, zIndex });

    // Destroy the old map if it exists
    if (map) {
      map.setTarget(null);
      map = null;
    }

    // Create a new ZarrTileSource
    zarrSource = new ZarrTileSource({ url, resolutions, tIndex, cIndices, zIndex });

    // Create the new map
    map = new Map({
      target: 'map',
      layers: [new TileLayer({ source: zarrSource })],
      view: new View({
        projection: pixelProjection,
        center: [fullImageWidth / 2, fullImageHeight / 2],
        zoom: 1,
        // minZoom: 1,
        // maxZoom: 5,
        // extent: [0, 0, fullImageWidth, fullImageHeight]
      })
    });
  }

  // Run `createMap()` when the component mounts
  onMount(createMap);

  // Recreate `zarrSource` and `map` whenever `cIndices`, `tIndex`, or `zIndex` change
  $effect(() => {
    createMap();
  });


</script>

<!-- Map Container -->
<div>
  <div id="map" style="width: 100%; height: 500px; position: relative;"></div>



  <!-- Controls for user to modify tile settings -->
  <label>
    T Index: <input type="number" bind:value={tIndex}>
  </label>

  <label>
    C Indices (comma-separated):
    <input type="text" bind:value={cIndices} oninput={(e) => cIndices = e.target.value.split(',').map(Number) || [0]}>
  </label>

  <label>
    Z Index: <input type="number" bind:value={zIndex}>
  </label>
</div>


<style>
  #map {
    background-color: black; /* Change this to any color you want */
  }
</style>

