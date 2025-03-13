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
  import ZarrVectorLoader from './ZarrVectorLoader';
  import { open } from "@zarrita/core";
  import { get, slice } from "@zarrita/indexing";
  import { initZarr } from './ZarrHelpers';
  import { applyPseudocolorToPixel, minMaxRangePixelTransform, hexToInt, intToHex} from './PixelTransforms.js';
  import { generateColorMapping } from './ColorHelpers';
  import { getOmeChannelNames } from './OmeHelpers';

  import { ZipFileStore } from "@zarrita/storage";
  import { HTTPRangeReader } from "@zarrita/storage/zip";
  import { Group } from "@zarrita/core";

  /**
   * @typedef {import("./types.js").Image} Image
   * @typedef {import("./types.js").Image} FeatureGroupVector
   */


  const defaults = {
    imagePallete: 'multiplex',
    featurePallete: 'bright',
  };

  // let imageMetadata = $state(null);
  // let vectorMetadata = $state(null);

  // let tIndex = $state(0);
  // let cIndices = $state([]);
  // let zIndex = $state(0);
  // let minValues = $state([]);
  // let maxValues = $state([]);
  // let channelToColor = $state(null);
  // let featureToColor = $state(null);

  // let visibleChannelNames = $state([]);
  // let visibleFeatureNames = $state([]);
  // let visibleFeatureGroups = [];
  // let visibleFeatureIndices = [];

  let images = $state(new globalThis.Map());
  let featureGroupVectors = $state(new globalThis.Map()); 

 

  let map;
  let pixelProjection;
  // let rasterLayer;
  // let rasterSource;
  // let sources = [];


  const transformSourcePixels = function (pixels, data) {
          let values = [];
          for (let i = 0; i < pixels.length; i++) {
            values.push(pixels[i][0]);  // Get multi-band pixel array
          }
          const normValues = minMaxRangePixelTransform(values, data.minValues, data.maxValues);
          const pseudoPixel = applyPseudocolorToPixel(data.colors.slice(0, normValues.length), normValues);
          return [...pseudoPixel];
  };

  function updateBeforeOperations(image) {
    const imageView = image.imageView;
    if (imageView.visibleChannelNames.length > 0) {
      const colors = imageView.visibleChannelNames.map(name => image.channelToColor.get(name));
      const minValues = imageView.visibleChannelNames.map(name => image.channelNameToView.get(name).minValue);
      const maxValues = imageView.visibleChannelNames.map(name => image.channelNameToView.get(name).maxValue);

      image.rasterSource.on('beforeoperations', function (event) {
          event.data.minValues = [...minValues];
          event.data.maxValues = [...maxValues];
          event.data.colors = colors;
      });
      image.rasterSource.changed();
    } 
  }

  function updateRasterSource(image) {
      image.rasterSource = new RasterSource({
          sources: [...image.imageView.zarrTileSources],
          operation: transformSourcePixels,
          lib: {
            minMaxRangePixelTransform: minMaxRangePixelTransform,
            applyPseudocolorToPixel: applyPseudocolorToPixel,
          },
      });
      updateBeforeOperations();

      image.rasterLayer = new ImageLayer({
          source: image.rasterSource,
      });

      map.addLayer(image.rasterLayer);
  }

  function addChannel(image, channelName) {
        console.log('adding channel', channelName);
        const cIndex = image.channelNames.indexOf(channelName);
        const newSource = new ZarrTileSource({
          node: image.node,
          fullImageHeight: image.sizeY,
          fullImageWidth: image.sizeX,
          tileSize: image.tileSize,
          resolutions: image.resolutions,
          tIndex: image.imageView.tIndex,
          cIndex: cIndex,
          zIndex: image.imageView.zIndex
        });

        image.imageView.visibleChannelNames.push(channelName);
        image.imageView.zarrTileSources.push(newSource);

        updateRasterSource(image);
  }

  function removeChannel(image, channelName) {
        console.log('removing channel', channelName);

        const removalIndex = image.imageView.visibleChannelNames.indexOf(channelName);

        image.imageView.visibleChannelNames.splice(removalIndex, 1);
        image.imageView.zarrTileSources.splice(removalIndex, 1);

        updateRasterSource(image);

        // rasterLayer.setSource(rasterSource);
  }

  

 

  function addFeature(featureName) {
    console.log('adding feature', featureName);
    const featureIndex = vectorMetadata.featureNames.indexOf(featureName);
    const featureGroup = vectorMetadata.featureGroups[featureIndex];

    const vectorLoader = new ZarrVectorLoader(
        vectorMetadata.node,
        vectorMetadata.sizeY,
        vectorMetadata.sizeX,
        pixelProjection,
        vectorMetadata.tileSize,
        vectorMetadata.resolutions,
        featureGroup,
    );
    console.log('new vectorLoader', vectorLoader);

    const vectorTileSource = vectorLoader.vectorTileSource;

    const vectorTileStyle = function (feature) {
      const idx = feature.values_.feature_index;
      const name = vectorMetadata.featureNames[idx];
      const fillColor = featureToColor.get(name);
      if (visibleFeatureIndices.includes(idx)) {
        const styleObj = new Style({
          image: new Circle({
            radius: 6,
            fill: new Fill({ color: fillColor }),
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
    const featureIndex = visibleFeatureNames.indexOf(featureName);
    const featureGroup = visibleFeatureGroups[featureIndex];
    
    visibleFeatureIndices.splice(featureIndex, 1);
    visibleFeatureGroups.splice(featureGroup, 1);
    visibleFeatureNames.splice(featureName, 1);

    const layer = featureGroupToLayer.get(featureGroup)

    layer.getSource().changed();

    map.removeLayer(layer);
    featureGroupToLayer.delete(featureGroup);
  }

  function createMap() {
    pixelProjection = new Projection({
      code: 'PIXEL',
      units: 'pixels',
      extent: [0, 0, imageMetadata.sizeX, imageMetadata.sizeY], // Define the image space
    });

    // Create the new map
    map = new Map({
      target: 'map',
      view: new View({
        projection: pixelProjection,
        center: [imageMetadata.sizeX / 2, imageMetadata.sizeY / 2],
        zoom: 1,
      })
    });

    map.on('pointermove', function (event) {
      const pixel = event.pixel;  // Mouse pixel coordinates
      const coordinate = event.coordinate; // Map coordinates
    });

    initializeRasterSource();
  }

  const featureGroupUrl = 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small.zarr.zip';
  const imageUrl = 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/image_small.zarr.zip';

//   /**
//  * @typedef {Object} ImageView
//  * @property {Map<string, ChannelView>} channelNameToView
//  * @property {number} opacity
//  * @property {number} tIndex
//  * @property {number} zIndex
//  * @property {number[]} visibleChannelNames
//  * @property {ZarrTileSource[]} zarrTileSources
// */

  function populateInitialImage(image) {
    // viewing stuff

    image.channelToColor = generateColorMapping(defaults.imagePallete, image.channelNames); // this will eventually be populated by pulled info

    const imageView = {
      channelNameToView: new globalThis.Map(),
      opacity: 1.0,
      tIndex: 0,
      zIndex: 0,
      visibleChannelNames: [],
      zarrTileSources: [],
    };
    image.imageView = imageView;

    for (let i = 0; i < image.channelNames.length; i++) {
      const channelName = image.channelNames[i];
      const channelView = {
        minValue: 0,
        maxValue: 255,
        gamma: 1.,
        color: image.channelToColor.get(channelName)
      };
      
      image.imageView.channelNameToView.set(channelName, channelView);
    }
    
    // make first channel visible by default
    const channelName = image.channelNames[0];
    addChannel(image, channelName);
  }
  // const loadVectorMetadata = async function () {
  //   let blank = [];
  //   const metaPath = '/metadata/features'
  //   const featureNamesArr = await open(vectorMetadata.node.resolve(`${metaPath}/feature_names`), { kind: "array" });
  //   const featureNamesChunk = await get(featureNamesArr, [null]);
  //   vectorMetadata.featureNames = featureNamesChunk.data;
  //   vectorMetadata.featureGroupsMap = new globalThis.Map();

  //   for (let i = 0; i < vectorMetadata.resolutions.length; i++) {
  //     const res = vectorMetadata.resolutions[i];
  //     const featureGroupsArr = await open(vectorMetadata.node.resolve(`${metaPath}/feature_groups/${res}`), { kind: "array" });
  //     const featureGroupsChunk = await get(featureGroupsArr, [null]);
  //     vectorMetadata.featureGroupsMap.set(res, featureGroupsChunk.data);
  //   }

  //   for (let i = 0; i < vectorMetadata.featureNames.length; i++) {
  //     let fgs = [];
  //     for (let j = 0; j < vectorMetadata.resolutions.length; j++) {
  //       const res = vectorMetadata.resolutions[j];
  //       fgs.push(vectorMetadata.featureGroupsMap.get(res)[i]);
  //     }
  //     blank.push(fgs.join());
  //   }
  //   vectorMetadata.featureGroups = blank;
  // };


  onMount(async () => {

    const imageNode = await initZarr(imageUrl);
    const featureVectorNode = await initZarr(featureGroupUrl);


    const image = {
      node: imageNode,
      version: imageNode.attrs.version,
      // @ts-ignore
      resolutions: imageNode.attrs.resolutions.sort((a, b) => b - a), //remember to sort
      ome: imageNode.attrs.ome,
      tileSize: imageNode.attrs.tile_size,
      // @ts-ignore
      sizeY: imageNode.attrs.ome.images[0].pixels.size_y,
      // @ts-ignore
      sizeX: imageNode.attrs.ome.images[0].pixels.size_x,
      // @ts-ignore
      sizeC: imageNode.attrs.ome.images[0].pixels.size_c,
      // @ts-ignore
      sizeT: imageNode.attrs.ome.images[0].pixels.size_t,
      // @ts-ignore
      sizeZ: imageNode.attrs.ome.images[0].pixels.size_z,
      upp: imageNode.attrs.upp,
      unit: imageNode.attrs.unit,
      channelNames: getOmeChannelNames(imageNode.attrs.ome),
    };
    populateInitialImage(image);
//     * @property {number} upp
//  * @property {string} unit
//  * @property {string[]} channelNames
//  * @property {ImageView} imageView
//  * @property {RasterSource} rasterSource
//  * @property {ImageLayer} imageLayer

    vectorMetadata = {
      node: vectorNode,
      version: vectorNode.attrs.version,
      resolutions: vectorNode.attrs.resolutions.sort((a, b) => b - a),
      sizeY: vectorNode.attrs.size[0],
      sizeX: vectorNode.attrs.size[1],
    };
    vectorMetadata.tileSize = vectorMetadata.resolutions[vectorMetadata.resolutions.length - 1];

    console.log('imageMetadata', imageMetadata);
    console.log('vectorMetadata', vectorMetadata);

    await loadVectorMetadata();
    setViewParams();
    createMap();
  });

  function toggleFeature(featureName) {
    if (visibleFeatureNames.includes(featureName)) {
      removeFeature(featureName);
    } else {
      addFeature(featureName);
    }
  }

  function toggleChannel(channelName) {
    if (visibleChannelNames.includes(channelName)) {
      removeChannel(channelName);
    } else {
      addChannel(channelName);
    }
  }

  $effect(() => {
    console.log('Checking for min/max updates:', JSON.stringify(minValues), JSON.stringify(maxValues));
    if (rasterSource) {
        updateBeforeOperations();
    }
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
    Select Channels:
    <div>
      {#if imageMetadata?.channelNames && imageMetadata.channelNames.length > 0}
        {#each imageMetadata.channelNames ?? [] as channelName}
          <label>
            <input type="checkbox"
                   checked={visibleChannelNames.includes(channelName)}
                   onchange={() => toggleChannel(channelName)}>
            {channelName}
          </label>
        {/each}
      {:else}
        <p>Loading channels...</p>
      {/if}
    </div>
  </label>
  <label>
    Min/Max Adjustment:
    {#each visibleChannelNames as channelName, i}
      <div>
        <label>{channelName} Min: <input type="number" bind:value={minValues[i]}></label>
        <label>Max: <input type="number" bind:value={maxValues[i]}></label>
      </div>
    {/each}
  </label>

  <label>
    Select Features:
    <div>
      {#if vectorMetadata?.featureNames && vectorMetadata.featureNames.length > 0}
        {#each vectorMetadata.featureNames ?? [] as featureName}
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

