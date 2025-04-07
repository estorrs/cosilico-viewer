<script>
  import { onMount } from "svelte";
  import Map from "ol/Map";
  import View from "ol/View";
  import { SvelteMap } from "svelte/reactivity";

  import { initZarr } from "./ZarrHelpers";
  import { Image } from "./Image";
  import { FeatureGroupVector, FeatureVector } from "./Vector";

  let reloadImageInfoKey = $state(true);
  let reloadLayerInfoKey = $state(true);
  let map;
  let experiment = $state(null);

  const experimentObj = {
    id: "alsdkfj",
    name: "Test Experiment",
    platform: "Xenium 5K",
    platform_version: "v5.1",
    metadata: {
      field_a: "this is a field",
    },
    images: [
      {
        id: "sldkfj",
        name: "Multiplex Image",
        metadata: {}, // this would be ome metadata
        view_settings: {}, // view settings eventually
        path: "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/image_small.zarr.zip",
      },
    ],
    layers: [
      {
        id: "sdf",
        name: "Transcripts",
        is_grouped: true,
        metadata: {}, // this would be just whatever metadata
        path: "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small.zarr.zip",
        view_settings: {},
        layer_metadatas: [
          {
            id: "sdlfkj",
            name: "Counts",
            type: "continuous",
            path: "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small_count.zarr.zip",
          },
          {
            id: "sdlsasfkj",
            name: "QV",
            type: "continuous",
            path: "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small_qv.zarr.zip",
          },
        ],
      },
      {
        id: "sldfkjasa",
        name: "Cells",
        is_grouped: false,
        metadata: {}, // this would be just whatever metadata
        view_settings: {},
        path: "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/cells_small.zarr.zip",
        layer_metadatas: [
          {
            id: "sadf",
            name: "Kmeans N=10",
            type: "categorical",
            view_settings: {},
            path: "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/cells_small_kmeansn10.zarr.zip",
          },
          {
            id: "sdfsdf",
            name: "PCAs",
            type: "continuous",
            view_settings: {},
            path: "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/cells_small_pca10.zarr.zip",
          },
          {
            id: "ggfg",
            name: "Transcript Counts",
            type: "continuous",
            view_settings: {},
            path: "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/cells_small_transcriptcounts.zarr.zip",
          },
        ],
      },
    ],
  };

  class Experiment {
    constructor(experimentObj) {
      this.imagesLoaded = false;
      this.layersLoaded = false;
      this.baseImage = null;
      this.experimentObj = experimentObj;
      this.imageOrder = [];
      this.layerOrder = [];
      this.layerToIsGrouped = new globalThis.Map();
      this.images = new globalThis.Map();
      this.layers = new globalThis.Map();
    }

    async init() {
      await this.loadImages();
      await this.loadLayers();
      return this;
    }

    static async create(obj) {
      const instance = new Experiment(obj);
      return await instance.init();
    }

    async loadImages() {
      for (const img of this.experimentObj.images) {
        const node = await initZarr(img.path);
        const obj = {
          image: new Image(node, img.id),
          viewSettings: img.view_settings,
        };
        this.images.set(img.id, obj);
        this.imageOrder.push(img.id);
      }

      this.baseImage = this.images.get(this.imageOrder[0]).image;

      this.imagesLoaded = true;
    }

    async loadGroupedLayer(gl) {
      const node = await initZarr(gl.path);

      let featureMetaToNode = new globalThis.Map();
      for (const mgl of gl.layer_metadatas) {
        const metadataNode = await initZarr(mgl.path);
        featureMetaToNode.set(metadataNode.attrs.name, metadataNode);
      }

      const fgv = await FeatureGroupVector.create(
        node,
        gl.id,
        featureMetaToNode,
        this.baseImage,
      );

      const obj = {
        vector: fgv,
        metadataToNode: featureMetaToNode,
        viewSettings: gl.view_settings,
        isGrouped: true,
      };

      this.layers.set(gl.id, obj);
      this.layerOrder.push(gl.id);
      this.layerToIsGrouped.set(gl.id, true);
    }

    async loadLayer(l) {
      const node = await initZarr(l.path);

      const fv =  await FeatureVector.create(node, l.id, this.baseImage);

      let featureMetaToNode = new globalThis.Map();
      for (const mgl of l.layer_metadatas) {
        const metadataNode = await initZarr(mgl.path);
        featureMetaToNode.set(metadataNode.attrs.name, metadataNode);
      }

      const obj = {
        vector: fv,
        metadataToNode: featureMetaToNode,
        viewSettings: l.view_settings,
        isGrouped: false,
      };

      this.layers.set(l.id, obj);
      this.layerOrder.push(l.id);
      this.layerToIsGrouped.set(l.id, false);
    }

    async loadLayers() {
      for (const l of this.experimentObj.layers) {
        if (l.is_grouped) {
          await this.loadGroupedLayer(l);
        } else {
          await this.loadLayer(l);
        }
      }

      this.layersLoaded = true;
    }

    async initializeLayerMetadata(map) {
      for (const [k, v] of this.layers) {
        if (!v.isGrouped) {
          // console.log('vector', v);
          await v.vector.setMetadata(null, null, map);
        }
      }
    }

  }

  function createMap(projection, sizeX, sizeY) {
    // Create the new map
    map = new Map({
      target: "map",
      view: new View({
        projection: projection,
        center: [sizeX / 2, sizeY / 2],
        zoom: 1,
      }),
    });
  }

  onMount(async () => {
    experiment = await Experiment.create(experimentObj);

    createMap(
      experiment.baseImage.projection,
      experiment.baseImage.sizeX,
      experiment.baseImage.sizeY,
    );

    // first channel of first image visible by default
    // console.log('base image', experiment.baseImage);
    experiment.baseImage.addChannel(
      experiment.baseImage.channelNames[0],
      map,
    );
    await experiment.initializeLayerMetadata(map);

    //set tooltip info, must fix
    for (const [k, layer] of experiment.layers) {
      let info = document.getElementById("info"); // this needs to be fixed
      layer.vector.setFeatureToolTip(map, info);
    }

    console.log('experiment', experiment);
    // const key = 'Kmeans N=10';
    // const key = 'PCAs';
    const key = 'Transcript Counts';
    const l = experiment.layers.get('sldfkjasa');
    await l.vector.setMetadata(key, l.metadataToNode.get(key), map)


    reloadImageInfoKey = !reloadImageInfoKey;
    reloadLayerInfoKey = !reloadLayerInfoKey;
  });

  function toggleFeature(featureName, vector) {
    let visible;
    if (vector instanceof FeatureVector) {
      visible = vector.vectorView.visibleFields;
      

    } else {
      visible = vector.vectorView.visibleFeatureNames;
      
    }
    if (visible.includes(featureName)) {
      vector.removeFeature(featureName, map);
    } else {
      vector.addFeature(featureName, map);
    }

    reloadLayerInfoKey = !reloadLayerInfoKey;
    
  }

  function toggleChannel(channelName, image) {
    if (image.imageView.visibleChannelNames.includes(channelName)) {
      image.removeChannel(channelName, map);
    } else {
      image.addChannel(channelName, map);
    }

    reloadImageInfoKey = !reloadImageInfoKey; // forces reload of channel info elements
  }

  function updateMinValue(image, channelName, event) {
    const newValue = event.target.value;
    const channelView = image.imageView.channelNameToView.get(channelName);
    channelView.minValue = Number(newValue);
    image.updateBeforeOperations();
  }

  function updateMaxValue(image, channelName, event) {
    const newValue = event.target.value;
    const channelView = image.imageView.channelNameToView.get(channelName);
    channelView.maxValue = Number(newValue);
    image.updateBeforeOperations();
  }
</script>

<!-- Map Container -->
<div>
  <div id="info" class="ol-tooltip hidden"></div>
  <div id="map" style="width: 100%; height: 500px; position: relative;"></div>
  <!-- {#key reloadImageInfoKey} -->
  <!-- {console.log(experiment)}; -->
  {#if experiment}
    {#each Array.from(experiment.images.values()) as obj}
      <!-- {console.log("image obj", obj)} -->
        <label>
          Select Channels ({obj.image.name}):
          <div>
            {#if obj.image?.channelNames && obj.image.channelNames.length > 0}
              {#each obj.image.channelNames ?? [] as channelName}
                <label>
                  <input
                    type="checkbox"
                    checked={obj.image.imageView.visibleChannelNames.includes(
                      channelName,
                    )}
                    onchange={() => toggleChannel(channelName, obj.image)}
                  />
                  {channelName}
                </label>
              {/each}
            {:else}
              <p>Loading channels...</p>
            {/if}
          </div>
        </label>

        {#key reloadImageInfoKey}
          <label>
            Min/Max Adjustment ({obj.image.name}):
            {#each obj.image.imageView.visibleChannelNames as channelName, j}
              <div>
                <label
                  >{channelName} Min:
                  <input
                    type="number"
                    value={obj.image.imageView.channelNameToView.get(
                      channelName,
                    ).minValue}
                    onchange={(event) =>
                      updateMinValue(obj.image, channelName, event)}
                  />
                </label>
                <label
                  >Max:
                  <input
                    type="number"
                    value={obj.image.imageView.channelNameToView.get(
                      channelName,
                    ).maxValue}
                    onchange={(event) =>
                      updateMaxValue(obj.image, channelName, event)}
                  />
                </label>
              </div>
            {/each}
          </label>
        {/key}
      <!-- {/if} -->
    {/each}
    <!-- {/key} -->

    <!-- Select Features for cells -->
    {#key reloadLayerInfoKey}
      {#each Array.from(experiment.layers.values()) as obj}
      {console.log('layer obj', obj)}
        {#if !obj.isGrouped}
          <label>
            Select Features ({obj.vector.name}):
            <div>
              {#if obj.vector.metadataFields && obj.vector.metadataFields.length > 0}
                {#each obj.vector.metadataFields ?? [] as field}
                  <label>
                    <input
                      type="checkbox"
                      checked={obj.vector.vectorView.visibleFields.includes(
                        field,
                      )}
                      onchange={() => toggleFeature(field, obj.vector)}
                    />
                    {field}
                  </label>
                {/each}
              {:else}
                <p>Loading cell features...</p>
              {/if}
            </div>
          </label>
        {/if}
        {#if obj.isGrouped}
          <label>
            Select Features ({obj.vector.name}):
            <div>
              {#if obj.vector?.featureNames && obj.vector.featureNames.length > 0}
                {#each obj.vector.featureNames ?? [] as featureName}
                  <label>
                    <input
                      type="checkbox"
                      checked={obj.vector.vectorView.visibleFeatureNames.includes(
                        featureName,
                      )}
                      onchange={() => toggleFeature(featureName, obj.vector)}
                    />
                    {featureName}
                  </label>
                {/each}
              {:else}
                <p>Loading features...</p>
              {/if}
            </div>
          </label>
        {/if}
      {/each}
    {/key}
  {/if}
</div>

<style global>
  #map {
    background-color: black; /* Change this to any color you want */
  }
  #info {
    position: absolute;
    display: inline-block;
    height: auto;
    width: auto;
    z-index: 100;
    background-color: #333;
    color: #fff;
    text-align: center;
    border-radius: 4px;
    padding: 5px;
    left: 50%;
    transform: translateX(3%);
    visibility: hidden;
    pointer-events: none;
  }
</style>
