<script>
  import { onMount } from 'svelte';
  import Map from 'ol/Map';
  import View from 'ol/View';
  import TileLayer from 'ol/layer/Tile';
  import ImageLayer from 'ol/layer/Image';
  import RasterSource from 'ol/source/Raster';
  import WebGLTileLayer from 'ol/layer/WebGLTile.js';
  import { get as getProjection, Projection } from 'ol/proj';
  import { ScaleLine } from 'ol/control';
  import ZarrTileSource from './ZarrTileSource';
  import { applyPseudocolorToPixel, minMaxRangePixelTransform, hexToInt, intToHex} from './PixelTransforms.js';



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
  let colors = ['FF0000', '00FF00', '0000FF', '00FFFF'];
 

  let map;
  let scaleControl;
  let rasterLayer;
  let rasterSource;
  let sources = [];

  // Define a projection where 1 pixel = 1 coordinate unit
  const pixelProjection = new Projection({
    code: 'PIXEL',
    units: 'pixels',
    extent: [0, 0, fullImageWidth, fullImageHeight], // Define the image space
  });

  const transformSourcePixels = function (pixels, data) {
          let values = [];
          for (let i = 0; i < pixels.length; i++) {
            // self.console.log(pixels);
            values.push(pixels[i][0]);  // Get multi-band pixel array
          }
          const normValues = minMaxRangePixelTransform(values, data.minValues, data.maxValues);
          // const pseudoPixel = applyPseudocolorToPixel(data.colors.slice(0, pixels.length), normValues);
          // const normValues = minMaxRangePixelTransform(values, [0], [50]);
          const pseudoPixel = applyPseudocolorToPixel(['#FF0000'], normValues);
          return [...pseudoPixel];
  };

  function createRasterSource() {
    rasterSource = new RasterSource({
          sources: sources, // Initially empty
          operation: transformSourcePixels,
          lib: {
            minMaxRangePixelTransform: minMaxRangePixelTransform,
            applyPseudocolorToPixel: applyPseudocolorToPixel,
            intToHex,
            minValues: minValues,
            maxValues: maxValues,
            colors: [...colors.map(hexToInt)],
          },
      });
      updateBeforeOperations();
      return rasterSource;
  }

  function initializeRasterSource() {
      
      rasterSource = createRasterSource();
      rasterLayer = new ImageLayer({
          source: rasterSource,
      });

      map.addLayer(rasterLayer);
  }

  // Function to dynamically add a new channel to RasterSource
  function addChannels() {
    console.log(cIndices.length, sources.length);
    if (cIndices.length > sources.length) {
        const cIndex = cIndices[cIndices.length - 1];
        console.log('adding channel', cIndex);
        const newSource = new ZarrTileSource({ url, fullImageHeight, fullImageWidth, pixelProjection, tileSize, resolutions, tIndex, cIndex, zIndex });

        sources.push(newSource); // Add new source to the array

        rasterSource = createRasterSource();

        rasterLayer.setSource(rasterSource);

        if (cIndices.length == minValues.length + 1) {
          minValues.push(0);
        }
        if (cIndices.length == maxValues.length + 1) {
          maxValues.push(255);
        }



        // rasterSource.setSources(sources); // Update RasterSource
        // rasterSource.changed(); // Force OpenLayers to refresh the raster
    }
  }

  function updateBeforeOperations() {
    console.log('updating operations with');
    console.log('minValues', $state.snapshot(minValues));
    console.log('maxvalues', $state.snapshot(maxValues));
    rasterSource.on('beforeoperations', function (event) {
        event.data.minValues = [...minValues];
        event.data.maxValues = [...maxValues];
        // event.data.colors = colors;
    });
    rasterSource.changed();
  }

  // Function to create the map and tile source
  function createMap() {
    console.log("Creating new ZarrTileSource with indices:", { tIndex, cIndices, zIndex });

    // Destroy the old map if it exists
    if (map) {
      map.setTarget(null);
      map = null;
    }

    // Create the new map
    map = new Map({
      target: 'map',
      // layers: [new TileLayer({ source: zarrSource })],
      view: new View({
        projection: pixelProjection,
        center: [fullImageWidth / 2, fullImageHeight / 2],
        zoom: 1,
      })
    });

    initializeRasterSource();
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

  // function updateMinMax(event) {

  // }

  // function updateIndices() {
  //   console.log("Updating indices:", { tIndex, cIndices, zIndex });

  //   if (zarrSource) {
  //       zarrSource.setIndices(tIndex, cIndices, zIndex);

  //       // ✅ Refresh the map tiles without recreating the view
  //       map.getLayers().forEach(layer => {
  //           if (layer.getSource() === zarrSource) {
  //               layer.getSource().refresh();
  //           }
  //       });
  //   }
  // }


  $effect(() => {
    addChannels();
    updateBeforeOperations();
  })


  



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

