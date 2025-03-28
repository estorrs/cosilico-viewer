<script>
  import { onMount } from "svelte";
  import Map from "ol/Map";
  import View from "ol/View";
  import { SvelteMap } from "svelte/reactivity";

  import { initZarr } from "./ZarrHelpers";
  import { Image } from "./Image";
  import { FeatureGroupVector } from "./Vector";

  let images = $state(new SvelteMap());
  let featureGroupVectors = $state(new SvelteMap());

  let reloadChannelInfoKey = $state(true);
  let reloadFeatureInfoKey = $state(true);

  let map;

  function createMap(projection, sizeX, sizeY) {
    // Create the new map
    map = new Map({
      target: "map",
      view: new View({
        projection: projection,
        center: [sizeX / 2, sizeY / 2],
        zoom: 1,
        // minZoom: 1,
        // maxZoom: maxZoom

      }),
    });

  }

  const featureGroupUrl =
    "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small.zarr.zip";
  const featureCountUrl =
    "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small_count.zarr.zip";
  const featureQvUrl =
    "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small_qv.zarr.zip";
  const imageUrl =
    "https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/image_small.zarr.zip";

  onMount(async () => {
    const imageNode = await initZarr(imageUrl);
    const featureVectorNode = await initZarr(featureGroupUrl);
    const featureCountNode = await initZarr(featureCountUrl);
    const featureQvNode = await initZarr(featureQvUrl);

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

    images.set(multiplexImage.imageId, multiplexImage);
    featureGroupVectors.set(transcriptsVector.vectorId, transcriptsVector);

    createMap(
      multiplexImage.projection,
      multiplexImage.sizeX,
      multiplexImage.sizeY,
    );

    // wait so feature names can render to screen
    let interval = setInterval(() => {
        if (transcriptsVector.isLoaded) {
            console.log("Vector condition met! Stopping loop.");
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
