<script>
  import { onMount } from "svelte";
  import Map from "ol/Map";
  import View from "ol/View";
  import { SvelteMap } from "svelte/reactivity";

  import { initZarr } from "./ZarrHelpers";
  import { Image } from "./Image";
  import { FeatureGroupVector, FeatureVector } from "./Vector";

  let images = $state(new SvelteMap());
  let featureGroupVectors = $state(new SvelteMap());
  let featureVectors = $state(new SvelteMap());

  let reloadChannelInfoKey = $state(true);
  let reloadFeatureInfoKey = $state(true);
  let reloadCellInfoKey = $state(true);

  let map;

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

  

  const experiment = {
    id: 'alsdkfj',
    name: 'Test Experiment',
    platform: 'Xenium 5K',
    platform_version: 'v5.1',
    metadata: {
      field_a: 'this is a field'
    },
    images: [
      {
        id: 'sldkfj',
        name: 'Multiplex Image',
        metadata: {}, // this would be ome metadata
        path: 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/image_small.zarr.zip'
      }
    ],
    layers: [
      {
        id: 'sdf',
        name: 'Transcripts',
        is_grouped: true,
        metadata: {}, // this would be just whatever metadata
        path: 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small.zarr.zip',
        layer_metadatas: [
          {
            id: 'sdlfkj',
            name: 'Counts',
            // type: 'continuous',
            path: 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small_count.zarr.zip',
          },
          {
            id: 'sdlsasfkj',
            name: 'QV',
            // type: 'continuous',
            path: 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small_qv.zarr.zip',
          },
        ]
      },
      {
        id: 'sldfkjasa',
        name: 'Cells',
        is_grouped: false,
        metadata: {}, // this would be just whatever metadata
        path: 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/cells_small.zarr.zip',
        layer_metadatas: [
          {
            id: 'sadf',
            name: 'Kmeans N=10',
            // type: 'categorical',
            path: 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/cells_small_kmeansn10.zarr.zip',
          },
          // {
          //   id: 'szzadf',
          //   name: '',
          //   path: '',
          // },
          // {
          //   id: 'szzzzadf',
          //   name: '',
          //   path: '',
          // },
        ]
      }
    ],
  }

  const featureGroupUrl =
    "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small.zarr.zip";
  const featureCountUrl =
    "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small_count.zarr.zip";
  const featureQvUrl =
    "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small_qv.zarr.zip";
  const imageUrl =
    "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/image_small.zarr.zip";

  const cellsUrl = 
    "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/cells_small.zarr.zip";
  const cellCatUrl =
    "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/cells_small_kmeansn10.zarr.zip";

  onMount(async () => {
    const imageNode = await initZarr(imageUrl);
    const featureVectorNode = await initZarr(featureGroupUrl);
    const featureCountNode = await initZarr(featureCountUrl);
    const featureQvNode = await initZarr(featureQvUrl);

    const cellNode = await initZarr(cellsUrl);
    const cellCatNode = await initZarr(cellCatUrl);


    const multiplexImage = new Image(imageNode, "asdlfjk");

    const featureMetaToNode = new globalThis.Map([
      [featureCountNode.attrs.name, featureCountNode],
      [featureQvNode.attrs.name, featureQvNode]
    ]);
    const transcriptsVector = new FeatureGroupVector(
      featureVectorNode,
      "lsdkjf",
      featureMetaToNode,
      multiplexImage.tileSize,
    );
    const cellsVector = new FeatureVector(
      cellNode,
      "sldkfj",
      multiplexImage.tileSize
    );

    images.set(multiplexImage.imageId, multiplexImage);
    featureGroupVectors.set(transcriptsVector.vectorId, transcriptsVector);
    featureVectors.set(cellsVector.vectorId, cellsVector);

    createMap(
      multiplexImage.projection,
      multiplexImage.sizeX,
      multiplexImage.sizeY,
    );
    cellsVector.setMetadata(
      'KNN cluster',
      cellCatNode,
      map
    )
    // wait so feature names can render to screen
    let cellsInterval = setInterval(() => {
        if (cellsVector.isLoaded) {
            reloadCellInfoKey = !reloadCellInfoKey;
            clearInterval(interval); 
        }
    }, 100); // Runs every 100ms (0.1s)

    // wait so feature names can render to screen
    let interval = setInterval(() => {
        if (transcriptsVector.isLoaded) {
            reloadFeatureInfoKey = !reloadFeatureInfoKey;
            clearInterval(interval); 
        }
    }, 100); // Runs every 100ms (0.1s)

    // make first channel visible by default
    multiplexImage.addChannel(multiplexImage.channelNames[0], map);

    //set tooltip info
    let info = document.getElementById('info');
    transcriptsVector.setFeatureToolTip(map, info);
  });

  function toggleFeature(featureName, catVector) {
    if (catVector.vectorView.visibleFeatureNames.includes(featureName)) {
      catVector.removeFeature(featureName, map);
    } else {
      catVector.addFeature(featureName, map);
    }
  }

  function toggleChannel(channelName, image) {
    if (image.imageView.visibleChannelNames.includes(channelName)) {
      image.removeChannel(channelName, map);
    } else {
      image.addChannel(channelName, map);
    }

    reloadChannelInfoKey = !reloadChannelInfoKey; // forces reload of channel info elements
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
  {#each Array.from(images.values()) as image}
    {#if image.imageView}
      <label>
        Select Channels ({image.name}):
        <div>
          {#if image?.channelNames && image.channelNames.length > 0}
            {#each image.channelNames ?? [] as channelName}
              <label>
                <input
                  type="checkbox"
                  checked={image.imageView.visibleChannelNames.includes(
                    channelName,
                  )}
                  onchange={() => toggleChannel(channelName, image)}
                />
                {channelName}
              </label>
            {/each}
          {:else}
            <p>Loading channels...</p>
          {/if}
        </div>
      </label>

      {#key reloadChannelInfoKey}
        <label>
          Min/Max Adjustment ({image.name}):
          {#each image.imageView.visibleChannelNames as channelName, j}
            <div>
              <label
                >{channelName} Min:
                <input
                  type="number"
                  value={image.imageView.channelNameToView.get(channelName)
                    .minValue}
                  onchange={(event) =>
                    updateMinValue(image, channelName, event)}
                />
              </label>
              <label
                >Max:
                <input
                  type="number"
                  value={image.imageView.channelNameToView.get(channelName)
                    .maxValue}
                  onchange={(event) =>
                    updateMaxValue(image, channelName, event)}
                />
              </label>
            </div>
          {/each}
        </label>
      {/key}
    {/if}
  {/each}

  <!-- Select Features for cells -->
  {#key reloadCellInfoKey}
  {#each Array.from(featureVectors.values()) as fVector}
    <label>
      Select Features ({fVector.name}):
      <div>
        {#if fVector.metadataFields && fVector.metadataFields.length > 0}
          {#each fVector.metadataFields ?? [] as field}
            <label>
              <input
                type="checkbox"
                checked={fVector.vectorView.visibleFields.includes(
                  field,
                )}
                onchange={() => toggleFeature(field, fVector)}
              />
              {field}
            </label>
          {/each}
        {:else}
          <p>Loading cell features...</p>
        {/if}
      </div>
    </label>
  {/each}
  {/key}

  <!-- Select Features for Multiple Vectors -->
  {#key reloadFeatureInfoKey}
  {#each Array.from(featureGroupVectors.values()) as fgVector}
    <label>
      Select Features ({fgVector.name}):
      <div>
        {#if fgVector?.featureNames && fgVector.featureNames.length > 0}
          {#each fgVector.featureNames ?? [] as featureName}
            <label>
              <input
                type="checkbox"
                checked={fgVector.vectorView.visibleFeatureNames.includes(
                  featureName,
                )}
                onchange={() => toggleFeature(featureName, fgVector)}
              />
              {featureName}
            </label>
          {/each}
        {:else}
          <p>Loading features...</p>
        {/if}
      </div>
    </label>
  {/each}
  {/key}
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
