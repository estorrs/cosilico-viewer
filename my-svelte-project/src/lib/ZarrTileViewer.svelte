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
  let fullImageWidth = 51265;  // Example: full resolution width in pixels
  let fullImageHeight = 74945;  // Example: full resolution height in pixels
  let micronsPerPixel = 0.2125; // Microns per pixel at full resolution

  let map;
  let tIndex = $state(0);
  let cIndices = $state([0]);
  let zIndex = $state(0);
  let resolutions = $state([512, 1024, 2048, 4096, 8192, 16384, 32768, 65536]);
  let url = 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing//image.zarr.zip';

  let zarrSource;

  // Define a projection where 1 pixel = 1 coordinate unit
  const pixelProjection = new Projection({
    code: 'PIXEL',
    units: 'pixels',
    extent: [0, 0, fullImageWidth, fullImageHeight], // Define the image space
  });

  onMount(() => {
    zarrSource = new ZarrTileSource({ url, resolutions, tIndex, cIndices, zIndex });

    map = new Map({
      target: 'map',
      layers: [
        new TileLayer({ source: zarrSource })
      ],
      view: new View({
        projection: pixelProjection, // ✅ Use pixel-based projection
        center: [fullImageWidth / 2, fullImageHeight / 2], // Center in pixel space
        zoom: 2,
        extent: [0, 0, fullImageWidth, fullImageHeight] // Restrict movement to image bounds
      })
    });

    // Add Scale Bar in Microns
    const scaleBar = new ScaleLine({
      units: 'metric', 
      bar: true,
      steps: 4,
      text: true,
      minWidth: 100,
      render: (event) => {
        const scaleElement = event.target.element;
        const scaleText = scaleElement.querySelector('.ol-scale-text');

        if (scaleText) {
          const originalScale = parseFloat(scaleText.innerText.replace(/[^\d.]/g, '')); // Extract numeric value
          const scaleInMicrons = originalScale * 1e6 / micronsPerPixel; // Convert meters to microns
          scaleText.innerText = `${scaleInMicrons.toFixed(1)} µm`; // Display in microns
        }
      }
    });

    map.addControl(scaleBar);
  });

  function updateIndices() {
    zarrSource.setIndices(tIndex, cIndices, zIndex);
  }
</script>

<!-- Map Container -->
<div>
  <div id="map" style="width: 100%; height: 500px; position: relative;"></div>

  <!-- Controls for user to modify tile settings -->
  <label>
    T Index: <input type="number" bind:value={tIndex} oninput={updateIndices}>
  </label>

  <label>
    C Indices (comma-separated):
    <input type="text" bind:value={cIndices} oninput={(e) => cIndices = e.target.value.split(',').map(Number) || [0]}>
  </label>

  <label>
    Z Index: <input type="number" bind:value={zIndex} oninput={updateIndices}>
  </label>
</div>


<style>
  :global(.ol-scale-bar) {
    position: absolute;
    bottom: 10px;
    left: 10px;
    background: white;
    padding: 4px;
    border-radius: 4px;
  }
</style>

