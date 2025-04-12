<script>
	import { onMount } from 'svelte';
	import Map from 'ol/Map';
	import View from 'ol/View';
	import { SvelteMap } from 'svelte/reactivity';
	import OverviewMap from 'ol/control/OverviewMap.js';
	import { defaults as defaultControls } from 'ol/control/defaults.js';

	import * as Accordion from '$lib/components/ui/accordion';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	import { initZarr } from './openlayers/ZarrHelpers';
	import { Image } from './openlayers/Image';
	import { FeatureGroupVector, FeatureVector } from './openlayers/Vector';
	import Check from 'lucide-svelte/icons/check';

	let reloadImageInfoKey = $state(true);
	let reloadLayerInfoKey = $state(true);
	let map;
	let experiment = $state(null);
  let mirrors = $state(null);

	const experimentObj = {
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
				view_settings: {}, // view settings eventually
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
				view_settings: {},
				layer_metadatas: [
					{
						id: 'sdlfkj',
						name: 'Counts',
						type: 'continuous',
						path: 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small_count.zarr.zip'
					},
					{
						id: 'sdlsasfkj',
						name: 'QV',
						type: 'continuous',
						path: 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/points_small_qv.zarr.zip'
					}
				]
			},
			{
				id: 'sldfkjasa',
				name: 'Cells',
				is_grouped: false,
				metadata: {}, // this would be just whatever metadata
				view_settings: {},
				path: 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/cells_small.zarr.zip',
				layer_metadatas: [
					{
						id: 'sadf',
						name: 'Kmeans N=10',
						type: 'categorical',
						view_settings: {},
						path: 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/cells_small_kmeansn10.zarr.zip'
					},
					{
						id: 'sdfsdf',
						name: 'PCAs',
						type: 'continuous',
						view_settings: {},
						path: 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/cells_small_pca10.zarr.zip'
					},
					{
						id: 'ggfg',
						name: 'Transcript Counts',
						type: 'continuous',
						view_settings: {},
						path: 'https://ceukgaimyworytcbpvfu.supabase.co/storage/v1/object/public/testing/cells_small_transcriptcounts.zarr.zip'
					}
				]
			}
		]
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
					image: new Image(node, img.id, false),
					viewSettings: img.view_settings
				};
				this.images.set(img.id, obj);
				this.imageOrder.push(img.id);
			}

			this.baseImage = this.images.get(this.imageOrder[0]).image;
			this.baseImage.isBaseImage = true;

			this.imagesLoaded = true;
		}

		async loadGroupedLayer(gl) {
			const node = await initZarr(gl.path);

			let featureMetaToNode = new globalThis.Map();
			for (const mgl of gl.layer_metadatas) {
				const metadataNode = await initZarr(mgl.path);
				featureMetaToNode.set(metadataNode.attrs.name, metadataNode);
			}

			const fgv = await FeatureGroupVector.create(node, gl.id, featureMetaToNode, this.baseImage);

			const obj = {
				vector: fgv,
				metadataToNode: featureMetaToNode,
				viewSettings: gl.view_settings,
				isGrouped: true
			};

			this.layers.set(gl.id, obj);
			this.layerOrder.push(gl.id);
			this.layerToIsGrouped.set(gl.id, true);
		}

		async loadLayer(l) {
			const node = await initZarr(l.path);

			const fv = await FeatureVector.create(node, l.id, this.baseImage);

			let featureMetaToNode = new globalThis.Map();
			for (const mgl of l.layer_metadatas) {
				const metadataNode = await initZarr(mgl.path);
				featureMetaToNode.set(metadataNode.attrs.name, metadataNode);
			}

			const obj = {
				vector: fv,
				metadataToNode: featureMetaToNode,
				viewSettings: l.view_settings,
				isGrouped: false
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
			target: 'map',
			view: new View({
				projection: projection,
				center: [sizeX / 2, sizeY / 2],
				zoom: 1
			})
		});
	}

	function initializeMirrors() {
		// channel view info
		mirrors = new SvelteMap();

		let imageDisplayInfo = $state(new SvelteMap());
		for (const [imageId, obj] of experiment.images) {
			let channelToInfo = $state(new SvelteMap());
			for (const [channelName, view] of obj.image.imageView.channelNameToView) {
				let info = $state({
					minValue: view.minValue,
					maxValue: view.maxValue,
					gamma: view.gamma,
					color: view.color
				});
				channelToInfo.set(channelName, info);
			}
			imageDisplayInfo.set(imageId, channelToInfo);
		}

    let imageVisibilityInfo = $state(new SvelteMap());
		for (const [imageId, obj] of experiment.images) {
      imageVisibilityInfo.set(imageId, obj.image.isVisible);
    }


		mirrors.set('imageDisplayInfo', imageDisplayInfo);
    mirrors.set('imageVisabilityInfo', imageVisibilityInfo);

	}

	$effect(() => {
		if (mirrors != null) {
			const displayInfo = mirrors.get('imageDisplayInfo');
			for (const [imageId, channelToInfo] of displayInfo) {
				for (const [channelName, info] of channelToInfo) {
					let view = experiment.images
						.get(imageId)
						.image.imageView.channelNameToView.get(channelName);
					view.minValue = info.minValue;
					view.maxValue = info.maxValue;
					view.gamma = info.gamma;
					view.color = info.color;
				}
			}

      const visibilityInfo = mirrors.get('imageVisabilityInfo');
			for (const [imageId, isVisible] of visibilityInfo) {
        let image = experiment.images.get(imageId);
        image.isVisible = isVisible;
      }
		}
	});

	onMount(async () => {
		experiment = await Experiment.create(experimentObj);

		createMap(
			experiment.baseImage.projection,
			experiment.baseImage.sizeX,
			experiment.baseImage.sizeY
		);

		// first channel of first image visible by default
		await experiment.baseImage.addChannel(experiment.baseImage.channelNames[0], map);
		await experiment.initializeLayerMetadata(map);

		//set tooltip info, must fix
		for (const [k, layer] of experiment.layers) {
			let info = document.getElementById('info'); // this needs to be fixed
			layer.vector.setFeatureToolTip(map, info);
		}

		// const key = 'Kmeans N=10';
		// const key = 'PCAs';
		const key = 'Transcript Counts';
		const l = experiment.layers.get('sldfkjasa');
		await l.vector.setMetadata(key, l.metadataToNode.get(key), map);

		initializeMirrors();

		reloadImageInfoKey = !reloadImageInfoKey;
		reloadLayerInfoKey = !reloadLayerInfoKey;
	});

	async function toggleImage(image, value) {
		if (value) {
			// show layers logic here
			///
		} else {
			// hide layers logic here
			///
		}
		image.isVisible = value;

		// reloadImageInfoKey = !reloadImageInfoKey; // forces reload of image elements
	}

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

	async function toggleChannel(channelName, image) {
		if (image.imageView.visibleChannelNames.includes(channelName)) {
			await image.removeChannel(channelName, map);
		} else {
			await image.addChannel(channelName, map);
		}

		image.updateBeforeOperations();
		if (image.isBaseImage) {
			image.updateOverviewMapLayerOperations();
		}

		// reloadImageInfoKey = !reloadImageInfoKey; // forces reload of channel info elements
	}

	function updateMinValue(image, channelName, event) {
		const newValue = event.target.value;
		const channelView = image.imageView.channelNameToView.get(channelName);
		channelView.minValue = Number(newValue);
		image.updateBeforeOperations();
		if (image.isBaseImage) {
			image.updateOverviewMapLayerOperations();
		}
	}

	function updateMaxValue(image, channelName, event) {
		const newValue = event.target.value;
		const channelView = image.imageView.channelNameToView.get(channelName);
		channelView.maxValue = Number(newValue);
		image.updateBeforeOperations();
		if (image.isBaseImage) {
			image.updateOverviewMapLayerOperations();
		}
	}
</script>

<!-- Map Container -->
<div>
	<div id="info" class="ol-tooltip hidden"></div>
	<div id="map"></div>
	{#if experiment && mirrors != null}
		{#key reloadImageInfoKey}
			<Card.Root>
				<Card.Header>
					<Card.Title>Images</Card.Title>
				</Card.Header>
				<Card.Content>
					<Accordion.Root type="single">
						{#each Array.from(experiment.images.values()) as obj}
							<Accordion.Item>
								<!-- <div class="grid w-full grid-cols-[auto_1fr] items-center gap-2">
                  {console.log('mirror is', mirrors)}
                  {console.log('value is', mirrors.get('imageVisabilityInfo').get(obj.image.imageId))}
									<Checkbox
										checked={mirrors.get('imageVisabilityInfo').get(obj.image.imageId)}
										id="{obj.image.imageId}-checkbox"
										onCheckedChange={(v) => toggleImage(obj.image, v)}
									/> -->
                <Accordion.Trigger>
                  <span id="{obj.image.name}-text" class="text-left">{obj.image.name}</span>
                </Accordion.Trigger>
								<!-- </div> -->
								<Accordion.Content>
                  <p>hello</p>
									<!-- <Accordion.Root>
										{#each obj.image.channelNames as channelName}
                    {console.log('putting in channel card', channelName)}
											<Accordion.Item value="{obj.image.imageId}-{channelName}">
												<div class="grid w-full grid-cols-[auto_1fr] items-center gap-2">
													<Checkbox
														bind:checked={
															() => obj.image.imageView.visibleChannelNames.includes(channelName),
															(v) => toggleChannel(channelName, obj.image)
														}
														id="{obj.image.imageId}-{channelName}-checkbox"
													/>
													<Accordion.Trigger>
														<span id="{obj.image.imageId}-{channelName}-text" class="text-left">{channelName}</span>
													</Accordion.Trigger>
												</div>
												<Accordion.Content>
													<Card.Root>
														<Card.Header>
															<Card.Title>Intensity Threshold</Card.Title>
														</Card.Header>
														<Card.Content>
															<div class="flex w-full items-center gap-2">
																<Input
																	type="number"
																	value={mirrors
																		.get('imageDisplayInfo')
																		.get(imageId)
																		.get(channelName).minValue}
																	on:change={(e) => updateMinValue(image, channelName, e)}
																	class="w-[70px] text-left"
																/>
																<Slider
																	value={[
																		mirrors.get('imageDisplayInfo').get(imageId).get(channelName)
																			.minValue,
																		mirrors.get('imageDisplayInfo').get(imageId).get(channelName)
																			.maxValue
																	]}
																	min={obj.image.dtypeMin}
																	max={obj.image.dtypeMax}
																	step={1}
																	class="flex-1"
																/>
																<Input
																	type="number"
																	value={mirrors
																		.get('imageDisplayInfo')
																		.get(imageId)
																		.get(channelName).maxValue}
																	on:change={(e) => updateMaxValue(image, channelName, e)}
																	class="w-[70px] text-left"
																/>
															</div>
														</Card.Content>
													</Card.Root>
												</Accordion.Content>
											</Accordion.Item>
										{/each}
									</Accordion.Root> -->
								</Accordion.Content>
							</Accordion.Item>
						{/each}
					</Accordion.Root>
				</Card.Content>
			</Card.Root>
		{/key}

		<!-- {#key reloadLayerInfoKey}
			{#each Array.from(experiment.layers.values()) as obj}
				{#if !obj.isGrouped}
					<label>
						Select Features ({obj.vector.name}):
						<div>
							{#if obj.vector.metadataFields && obj.vector.metadataFields.length > 0}
								{#each obj.vector.metadataFields ?? [] as field}
									<label>
										<input
											type="checkbox"
											checked={obj.vector.vectorView.visibleFields.includes(field)}
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
											checked={obj.vector.vectorView.visibleFeatureNames.includes(featureName)}
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
		{/key}  -->
	{/if}
</div>

<style global>
	#map {
		background-color: black; /* Change this to any color you want */
		width: 100%;
		height: 500px;
		position: relative;
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

	:global(.ol-overviewmap),
	:global(.ol-overviewmap-map) {
		width: 200px;
		height: 200px;
	}
	:global(.ol-overviewmap-box) {
		border: 2px solid red;
	}
	:global(.ol-overviewmap.ol-uncollapsible button) {
		display: none !important;
	}
	:global(.ol-overviewmap) {
		all: unset;
		all: initial;
		box-sizing: content-box;
		border-style: none;
		position: absolute !important;
		bottom: 0px;
		left: 0px;
		top: auto !important;
		right: auto !important;
		border: 2px solid yellow;
	}
</style>
