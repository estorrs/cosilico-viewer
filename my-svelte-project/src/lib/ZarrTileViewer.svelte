<script>
  import { onMount } from 'svelte';
  import Map from 'ol/Map';
  import View from 'ol/View';
  import VectorTileLayer from 'ol/layer/VectorTile';
  import ImageLayer from 'ol/layer/Image';
  import RasterSource from 'ol/source/Raster';
  import { get as getProjection, Projection } from 'ol/proj';
  import { Fill, Stroke, Style, Circle } from 'ol/style.js';
  import ZarrTileSource from './ZarrTileSource';
  // import ZarrVectorTileSource from './ZarrVectorTileSource';
  import ZarrVectorLoader from './ZarrVectorLoader';
  import { applyPseudocolorToPixel, minMaxRangePixelTransform, hexToInt, intToHex} from './PixelTransforms.js';

  let vectorUrl = 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small.zarr.zip';

  let resolutions = [8192, 4096, 2048, 1024, 512];
  let url = 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/image_small.zarr.zip';
  
  let fullImageWidth = 5000;  // Example: full resolution width in pixels
  let fullImageHeight = 8000;  // Example: full resolution height in pixels
  let micronsPerPixel = 0.2125; // Microns per pixel at full resolution




  let tileSize = 512;

  let tIndex = $state(0);
  let cIndices = $state([]);
  let zIndex = $state(0);
  let minValues = $state([]);
  let maxValues = $state([]);
  let colors = ['#FF0000', '#00FF00', '#0000FF', '#00FFFF'];
 

  let map;
  let scaleControl;
  let rasterLayer;
  let rasterSource;
  let sources = [];

  let pointsLayer;

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
          const pseudoPixel = applyPseudocolorToPixel(data.colors.slice(0, normValues.length), normValues);
          return [...pseudoPixel];
  };

  function createRasterSource() {
    rasterSource = new RasterSource({
          sources: [...sources], // Initially empty
          operation: transformSourcePixels,
          lib: {
            minMaxRangePixelTransform: minMaxRangePixelTransform,
            applyPseudocolorToPixel: applyPseudocolorToPixel,
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

      addChannel(0);
  }

  function createVectorSource() {
    const vectorLoader = new ZarrVectorLoader(
        vectorUrl,
        fullImageHeight,
        fullImageWidth,
        pixelProjection,
        tileSize,
        resolutions,
        0 // feature group
    );

    const vectorTileSource = vectorLoader.vectorTileSource;


    // const vectorTileStyle = new Style({
    //     image: new Circle({
    //         radius: 1,
    //         fill: new Fill({ color: 'blue' }),
    //         stroke: new Stroke({ color: 'white', width: 0 })
    //     })
    // });



    const vectorTileStyle = function (feature) {
    // Example filter: Show only features with count > 10
      // console.log(feature);
      return new Style({
        image: new Circle({
          radius: 6,
          fill: new Fill({ color: 'blue' }),
          stroke: new Stroke({ color: 'white', width: 2 })
        })
      });
    }
    const vectorTileLayer = new VectorTileLayer({
        source: vectorTileSource,
        style: vectorTileStyle,
    });
    map.addLayer(vectorTileLayer);
  }

  function addChannel(cIndex) {
        console.log('adding channel', cIndex);

        const newSource = new ZarrTileSource({ url, fullImageHeight, fullImageWidth, pixelProjection, tileSize, resolutions, tIndex, cIndex, zIndex });

        cIndices.push(cIndex);
        sources.push(newSource);
        minValues.push(0);
        maxValues.push(255);

        rasterSource = createRasterSource();

        rasterLayer.setSource(rasterSource);
  }

  function removeChannel(cIndex) {
        console.log('removing channel', cIndex);
        const removalIndex = cIndices.indexOf(cIndex);

        cIndices.splice(removalIndex, 1);
        sources.splice(removalIndex, 1);
        minValues.splice(removalIndex);
        maxValues.splice(removalIndex);

        rasterSource = createRasterSource();

        rasterLayer.setSource(rasterSource);
  }

  function updateBeforeOperations() {
    console.log('running update', $state.snapshot(minValues), $state.snapshot(maxValues));
    rasterSource.on('beforeoperations', function (event) {
        event.data.minValues = [...minValues];
        event.data.maxValues = [...maxValues];
        event.data.colors = colors;
    });
    rasterSource.changed();
  }

  function createMap() {
    console.log("Creating new ZarrTileSource with indices:", { tIndex, cIndices, zIndex });

    if (map) {
      map.setTarget(null);
      map = null;
    }

    // Create the new map
    map = new Map({
      target: 'map',
      view: new View({
        projection: pixelProjection,
        center: [fullImageWidth / 2, fullImageHeight / 2],
        zoom: 1,
      })
    });

    map.on('pointermove', function (event) {
      const pixel = event.pixel;  // Mouse pixel coordinates
      const coordinate = event.coordinate; // Map coordinates
      // console.log('pixel', pixel);
      // console.log('coordinate', coordinate);
    });

    initializeRasterSource();
    createVectorSource();
  }

  onMount(createMap);

  function updateCIndices(event) {
    const value = parseInt(event.target.value);
    if (event.target.checked) {
      addChannel(value);
    } else {
      removeChannel(value);
    }
  }

  $effect(() => {
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

