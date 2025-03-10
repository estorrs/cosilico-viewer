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
  import { ZipFileStore } from "@zarrita/storage";
  import { open } from "@zarrita/core";
  import { get, slice } from "@zarrita/indexing";
  // import { initZarr } from './ZarrHelpers';
  import { applyPseudocolorToPixel, minMaxRangePixelTransform, hexToInt, intToHex} from './PixelTransforms.js';


  let vectorUrl = 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small.zarr.zip';

  let resolutions = [8192, 4096, 2048, 1024, 512];
  let url = 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/image_small.zarr.zip';


  let featureGroupsMap = new globalThis.Map();
  let featureGroups = $state(null);
  let featureNames = $state(null); 
  let blank = [];
  const loadVectorMetadata = async function () {
    const store = await ZipFileStore.fromUrl(vectorUrl);
    const node = await open(store); // Get the root structure
    const metaPath = '/metadata/features'
    const featureNamesArr = await open(node.resolve(`${metaPath}/feature_names`), { kind: "array" });
    const featureNamesChunk = await get(featureNamesArr, [null]);
    featureNames = featureNamesChunk.data;

    for (let i = 0; i < resolutions.length; i++) {
      const res = resolutions[i];
      const featureGroupsArr = await open(node.resolve(`${metaPath}/feature_groups/${res}`), { kind: "array" });
      const featureGroupsChunk = await get(featureGroupsArr, [null]);
      featureGroupsMap.set(res, featureGroupsChunk.data);
    }

    for (let i = 0; i < featureNames.length; i++) {
      let fgs = [];
      for (let j = 0; j < resolutions.length; j++) {
        const res = resolutions[j];
        fgs.push(featureGroupsMap.get(res)[i]);
      }
      blank.push(fgs);
    }
    featureGroups = blank;
  };

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
  let visibleFeatureNames = $state([]);
  let visibleFeatureGroups = [];
  let visibleFeatureIndices = [];
  let featureGroupToLayer = new globalThis.Map();
 

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

  function addFeature(featureName) {
    console.log('adding feature', featureName);
    const featureIndex = featureNames.indexOf(featureName);
    const featureGroup = featureGroups[featureIndex];

    const vectorLoader = new ZarrVectorLoader(
        vectorUrl,
        fullImageHeight,
        fullImageWidth,
        pixelProjection,
        tileSize,
        resolutions,
        featureGroup,
    );

    const vectorTileSource = vectorLoader.vectorTileSource;

    const vectorTileStyle = function (feature) {
      // console.log(feature);
      // const idx = feature.properties.feature_index;
      const idx = feature.values_.feature_index;
      // console.log(visibleFeatureIndices, idx);
      if (visibleFeatureIndices.includes(idx)) {
        const styleObj = new Style({
          image: new Circle({
            radius: 6,
            fill: new Fill({ color: 'blue' }),
            stroke: new Stroke({ color: 'white', width: 2 })
          })
        });
        return styleObj;
      }
    }

    const vectorTileLayer = new VectorTileLayer({
        source: vectorTileSource,
        style: vectorTileStyle,
    });

    map.addLayer(vectorTileLayer);

    featureGroupToLayer.set(featureGroup, vectorTileLayer);

    visibleFeatureIndices.push(featureIndex);
    visibleFeatureGroups.push(featureGroup);
    visibleFeatureNames.push(featureName);
  }

  function removeFeature(featureName) {
    console.log('removing feature', featureName);
    const featureIndex = featureNames.indexOf(featureName);
    const featureGroup = visibleFeatureGroups[featureIndex];
    
    visibleFeatureIndices.splice(featureIndex, 1);
    visibleFeatureGroups.slice(featureGroup, 1);
    visibleFeatureNames.splice(featureName, 1);

    map.removeLayer(featureGroupToLayer.get(featureGroup));
    featureGroupToLayer.delete(featureGroup);


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
    });

    initializeRasterSource();
    loadVectorMetadata();
  }

  onMount(createMap);

  function toggleFeature(featureName) {
    if (visibleFeatureNames.includes(featureName)) {
      removeFeature(featureName);
    } else {
      addFeature(featureName);
    }
  }

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
    Select Features:
    <div>
      {#if featureNames}
        {#each featureNames as featureName}
          <label>
            <input type="checkbox"
                   checked={visibleFeatureNames.includes(featureName)}
                   onchange={() => toggleFeature(featureName)}>
            {featureName}
          </label>
        {/each}
      {:else}
        <p>Loading features...</p>
      {/if}
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

