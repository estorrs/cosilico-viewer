<script>
  import { onMount } from 'svelte';
  import Map from 'ol/Map';
  import View from 'ol/View';
  import TileLayer from 'ol/layer/Tile';
  import { get as getProjection, Projection } from 'ol/proj';
  import { ScaleLine } from 'ol/control';
  import ZarrTileSource from './ZarrTileSource';


  let resolutions = [8192, 4096, 2048, 1024, 512];
  let url = 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/image_small.zarr.zip';

  // Image metadata
  let fullImageWidth = 5000;  // Example: full resolution width in pixels
  let fullImageHeight = 8000;  // Example: full resolution height in pixels
  let micronsPerPixel = 0.2125; // Microns per pixel at full resolution
  let tileSize = 512;

  let tIndex = $state(0);
  let cIndices = $state([0]);
  let zIndex = $state(0);
 

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
    zarrSource = new ZarrTileSource({ url, fullImageHeight, fullImageWidth, pixelProjection, tileSize, resolutions, tIndex, cIndices, zIndex });

    // Create the new map
    map = new Map({
      target: 'map',
      layers: [new TileLayer({ source: zarrSource })],
      view: new View({
        projection: pixelProjection,
        center: [fullImageWidth / 2, fullImageHeight / 2],
        zoom: 1,
      })
    });
  }

  onMount(createMap);

  // Recreate `zarrSource` and `map` whenever `cIndices`, `tIndex`, or `zIndex` change
  // $effect(() => {
  //   createMap();
  // });

  function updateCIndices(event) {
    const value = parseInt(event.target.value);
    if (event.target.checked) {
      cIndices = [...cIndices, value];
    } else {
      cIndices = cIndices.filter(i => i !== value);
    }
  }

  function updateIndices() {
    console.log("Updating indices:", { tIndex, cIndices, zIndex });

    if (zarrSource) {
        zarrSource.setIndices(tIndex, cIndices, zIndex);

        // ✅ Refresh the map tiles without recreating the view
        map.getLayers().forEach(layer => {
            if (layer.getSource() === zarrSource) {
                layer.getSource().refresh();
            }
        });
    }
  }
  $effect(() => {
    updateIndices();
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
    C Indices:
    <div>
      {#each [0, 1, 2, 3] as index}
        <label>
          <input type="checkbox" value={index} onchange={updateCIndices} checked={cIndices.includes(index)}>
          {index}
        </label>
      {/each}
    </div>
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

