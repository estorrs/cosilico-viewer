<script>
    import { onMount } from 'svelte';
    import Map from 'ol/Map';
    import View from 'ol/View';
    import TileLayer from 'ol/layer/Tile';
    import ImageLayer from 'ol/layer/Image.js';
    import RasterSource from 'ol/source/Raster.js';
    import { get as getProjection, Projection } from 'ol/proj';
    import { ScaleLine } from 'ol/control';
    import ZarrTileSource from './ZarrTileSource.js';
    import { applyPseudocolorToPixel, minMaxRangePixelTransform } from './PixelTransforms.js';

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
    let minValues = $state([0]);
    let maxValues = $state([255]);

    let colors = ['#FF0000', '#00FF00', '#0000FF', '#00FFFF'];
   
  
    let map;
    let zarrSource;
    let scaleControl;
    let rasterSource;
  
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

      const rasterOperation = function (pixels, data) {
            // self.console.log(pixels);
            const pixel = pixels[0];  // Get multi-band pixel array
            // self.console.log('pixel', pixel);
            return pixel;
            // return [255, 0, 0, 255];
            // return [pixel[0], pixel[0], pixel[0], 255];
            // self.console.log('pixel triggered');
            // return pixel;
            // console.log('raw pixel', pixel);

            // const rangePixel = minMaxRangePixelTransform(pixel, data.minValues, data.maxValues);

            // const rgbaPixel = applyPseudocolorToPixel(data.colors, rangePixel);

            // return [...rgbaPixel];
      };

      rasterSource = new RasterSource({
        sources: [zarrSource],  // 🔥 Uses `ZarrTileSource` as input
        operation: rasterOperation,
        operationType: 'image'
      });

      // set like this
      rasterSource.set('minValues', minValues);
      rasterSource.set('maxValues', maxValues);
      rasterSource.set('colors', colors);

      const rasterLayer = new ImageLayer({
          source: rasterSource,
      });
    
      // Create the new map
      map = new Map({
          target: 'map',
          layers: [rasterLayer],
          view: new View({
          projection: pixelProjection,
          center: [fullImageWidth / 2, fullImageHeight / 2],
          zoom: 1,
          })
      });
    }
    
    onMount(createMap);
  
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
          rasterSource.set('colors', colors.slice(0, cIndices.length));
      }
    }

    function updateDisplayPixels() {
      rasterSource.set('minValues', minValues);
      rasterSource.set('maxValues', maxValues);
    }
  
    $effect(() => {
      updateIndices();
    });
  
    $effect(() => {
      updateDisplayPixels();
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
      Min/Max Adjustment:
      {#each cIndices as index, i}
        <div>
          <label>Channel {index} Min: <input type="number" bind:value={minValues[i]}></label>
          <label>Max: <input type="number" bind:value={maxValues[i]}></label>
        </div>
      {/each}
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
  
  