<script>
	// @ts-nocheck

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
	import { Input } from '$lib/components/ui/input';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Slider } from '$lib/components/ui/slider';
	import SwatchSelector from './components/ui/swatch-selector/SwatchSelector.svelte';
	import PointViewOptions from './sidebar/PointViewOptions.svelte';
	import PolygonViewOptions from './sidebar/PolygonViewOptions.svelte';

	import LayerOptions from './sidebar/LayerOptions.svelte';
	import { initZarr } from './openlayers/ZarrHelpers';
	import { Image } from './openlayers/Image';
	import { FeatureGroupVector, FeatureVector } from './openlayers/Vector';

	import Check from '@lucide/svelte/icons/check';

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
			// @ts-ignore
			this.baseImage.isBaseImage = true;
			this.baseImage.isVisible = true;

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

		let imageSwatches = $state(new SvelteMap());
		for (const [imageId, obj] of experiment.images) {
			let channelSwatches = $state([]);
			for (const [channelName, view] of obj.image.imageView.channelNameToView) {
				channelSwatches.push(view.color);
			}
			imageSwatches.set(imageId, channelSwatches);
		}

		let imageVisibilityInfo = $state(new SvelteMap());
		for (const [imageId, obj] of experiment.images) {
			imageVisibilityInfo.set(imageId, obj.image.isVisible);
		}

		let layerVisabilityInfo = $state(new SvelteMap());
		for (const [vectorId, obj] of experiment.layers) {
			layerVisabilityInfo.set(vectorId, obj.vector.isVisible);
		}

		let layerPointViewInfo = $state(new SvelteMap());
		for (const [vectorId, obj] of experiment.layers) {
			let view = $state({
				viewAs: obj.vector.getCurrentObjectType(map),
				scale: obj.vector.vectorView.scale,
				fillOpacity: obj.vector.vectorView.fillOpacity,
				strokeOpacity: obj.vector.vectorView.strokeOpacity,
				strokeWidth: obj.vector.vectorView.strokeWidth,
				strokeColor: obj.vector.vectorView.strokeColor
			});
			layerPointViewInfo.set(vectorId, view);
		}

		let layerPolygonViewInfo = $state(new SvelteMap());
		for (const [vectorId, obj] of experiment.layers) {
			let view = $state({
				fillOpacity: obj.vector.vectorView.fillOpacity,
				strokeOpacity: obj.vector.vectorView.strokeOpacity,
				strokeWidth: obj.vector.vectorView.strokeWidth,
				strokeColor: obj.vector.vectorView.strokeColor,
				strokeDarkness: obj.vector.vectorView.strokeDarkness,
			});
			layerPolygonViewInfo.set(vectorId, view);
		}

		mirrors.set('imageDisplayInfo', imageDisplayInfo);
		mirrors.set('imageSwatches', imageSwatches);
		mirrors.set('imageVisabilityInfo', imageVisibilityInfo);
		mirrors.set('layerVisabilityInfo', layerVisabilityInfo);
		mirrors.set('layerPointViewInfo', layerPointViewInfo);
		mirrors.set('layerPolygonViewInfo', layerPolygonViewInfo);
	}

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

		// //set tooltip info, must fix
		// for (const [k, layer] of experiment.layers) {
		// 	let info = document.getElementById('info'); // this needs to be fixed
		// 	layer.vector.setFeatureToolTip(map, info);
		// }

		// const key = 'Kmeans N=10';
		// const key = 'PCAs';
		// const key = 'Transcript Counts';
		// const l = experiment.layers.get('sldfkjasa');
		// await l.vector.setMetadata(key, l.metadataToNode.get(key), map);

		initializeMirrors();

		reloadImageInfoKey = !reloadImageInfoKey;
		reloadLayerInfoKey = !reloadLayerInfoKey;
	});

	async function toggleLayer(vector, value) {
		if (value) {
			// show layers logic here
			///
		} else {
			// hide layers logic here
			///
		}
		vector.isVisible = value;
	}

	function toggleFeature(featureName, vector, isVisible) {
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

		// reloadLayerInfoKey = !reloadLayerInfoKey;
	}

	async function toggleChannel(channelName, image) {
		if (image.imageView.visibleChannelNames.includes(channelName)) {
			console.log('removing', channelName);
			await image.removeChannel(channelName, map);
		} else {
			console.log('adding', channelName);
			await image.addChannel(channelName, map);
		}

		image.updateBeforeOperations();
		if (image.isBaseImage) {
			image.updateOverviewMapLayerOperations();
		}
	}

	function changeChannelColor(channelName, image, value) {
		console.log('setting channel color', channelName, value);
		image.setChannelColor(channelName, value);
		mirrors.get('imageDisplayInfo').get(image.imageId).get(channelName).color = value;

		image.updateBeforeOperations();
		if (image.isBaseImage) {
			image.updateOverviewMapLayerOperations();
		}
	}

	function getMinThresholdValue(image, channelName) {
		return mirrors.get('imageDisplayInfo').get(image.imageId).get(channelName).minValue;
	}
	function getMaxThresholdValue(image, channelName) {
		return mirrors.get('imageDisplayInfo').get(image.imageId).get(channelName).maxValue;
	}
	function setMinThresholdValue(image, channelName, value) {
		console.log('min threshold change', value);
		let view = image.imageView.channelNameToView.get(channelName);
		value = Number(value);
		if (value >= view.maxValue) {
			value = view.maxValue - 1;
		}
		view.minValue = value;

		let info = mirrors.get('imageDisplayInfo').get(image.imageId).get(channelName);
		info.minValue = value;

		image.updateBeforeOperations();
		if (image.isBaseImage) {
			image.updateOverviewMapLayerOperations();
		}
	}
	function setMaxThresholdValue(image, channelName, value) {
		let view = image.imageView.channelNameToView.get(channelName);
		value = Number(value);
		if (value <= view.minValue) {
			value = view.minValue + 1;
		}
		view.maxValue = value;

		let info = mirrors.get('imageDisplayInfo').get(image.imageId).get(channelName);
		info.maxValue = value;

		image.updateBeforeOperations();
		if (image.isBaseImage) {
			image.updateOverviewMapLayerOperations();
		}
	}

	function getThresholdValues(image, channelName) {
		const info = mirrors.get('imageDisplayInfo').get(image.imageId).get(channelName);
		const minValue = info.minValue;
		const maxValue = info.maxValue;
		return [minValue, maxValue];
	}

	function setThresholdValues(image, channelName, values) {
		let info = mirrors.get('imageDisplayInfo').get(image.imageId).get(channelName);
		info.minValue = values[0];
		info.maxValue = values[1];

		let view = image.imageView.channelNameToView.get(channelName);
		view.minValue = values[0];
		view.maxValue = values[1];

		image.updateBeforeOperations();
		if (image.isBaseImage) {
			image.updateOverviewMapLayerOperations();
		}
	}
</script>

<div>
	<div id="info" class="ol-tooltip hidden"></div>
	<div id="map"></div>
	<div class="absolute right-4 top-4 z-50 w-96">
		{#if experiment && mirrors != null}
			{#key reloadImageInfoKey}
				<ScrollArea orientation="both">
					<Card.Root>
						<Card.Header>
							<Card.Title>Images</Card.Title>
						</Card.Header>
						<Card.Content>
							<Accordion.Root type="single">
								{#each Array.from(experiment.images.values()) as obj}
									<Accordion.Item value="{obj.image.imageId}-item">
										<div class="grid w-full grid-cols-[auto_1fr] items-center gap-2">
											<Checkbox
												checked={mirrors.get('imageVisabilityInfo').get(obj.image.imageId)}
												id="{obj.image.imageId}-visibility-checkbox"
												onCheckedChange={(v) => {
													obj.image.setVisibility(v);
													mirrors.get('imageVisabilityInfo').set(obj.image.imageId, v);
												}}
											/>
											<Accordion.Trigger>
												<span id="{obj.image.name}-trigger-text" class="text-left"
													>{obj.image.name}</span
												>
											</Accordion.Trigger>
										</div>
										<Accordion.Content class="ml-3">
											<Accordion.Root>
												{#each obj.image.channelNames as channelName}
													<Accordion.Item value="{obj.image.imageId}-{channelName}-item">
														<div class="grid w-full grid-cols-[auto_1fr] items-center gap-2">
															<div class="flex items-center gap-2">
																<Checkbox
																	checked={obj.image.imageView.visibleChannelNames.includes(
																		channelName
																	)}
																	onCheckedChange={(v) => toggleChannel(channelName, obj.image)}
																/>
																<SwatchSelector
																	hex={mirrors
																		.get('imageDisplayInfo')
																		.get(obj.image.imageId)
																		.get(channelName).color}
																	swatchHexs={mirrors.get('imageSwatches').get(obj.image.imageId)}
																	onColorSelection={(value) =>
																		changeChannelColor(channelName, obj.image, value)}
																/>
															</div>
															<Accordion.Trigger>
																<span id="{obj.image.imageId}-{channelName}-text" class="text-left"
																	>{channelName}</span
																>
															</Accordion.Trigger>
														</div>
														<Accordion.Content class="ml-3">
															<Card.Root class="p-1">
																<Card.Header class="p-1">
																	<Card.Title class="text-sm">Intensity Threshold</Card.Title>
																	<!-- <Card.Description>Intensity Threshold</Card.Description> -->
																</Card.Header>
																<Card.Content class="p-1 pt-0">
																	<div class="flex w-full items-center gap-3">
																		<Input
																			type="number"
																			value={mirrors
																				.get('imageDisplayInfo')
																				.get(obj.image.imageId)
																				.get(channelName).minValue}
																			onchange={(e) =>
																				setMinThresholdValue(
																					obj.image,
																					channelName,
																					e.target.value
																				)}
																			class="w-[70px] px-1 text-left"
																		/>
																		<Slider
																			bind:value={
																				() => getThresholdValues(obj.image, channelName),
																				(vs) => setThresholdValues(obj.image, channelName, vs)
																			}
																			min={obj.image.dtypeMin}
																			max={obj.image.dtypeMax}
																			step={1}
																			class="flex-1"
																		/>
																		<Input
																			type="number"
																			value={mirrors
																				.get('imageDisplayInfo')
																				.get(obj.image.imageId)
																				.get(channelName).maxValue}
																			onchange={(e) =>
																				setMaxThresholdValue(
																					obj.image,
																					channelName,
																					e.target.value
																				)}
																			class="w-[70px] px-1 text-left"
																		/>
																	</div>
																</Card.Content>
															</Card.Root>
														</Accordion.Content>
													</Accordion.Item>
												{/each}
											</Accordion.Root>
										</Accordion.Content>
									</Accordion.Item>
								{/each}
							</Accordion.Root>
						</Card.Content>
					</Card.Root>
					<Card.Root>
						<Card.Header>
							<Card.Title>Layers</Card.Title>
						</Card.Header>
						<Card.Content>
							<Accordion.Root type="single">
								{#each Array.from(experiment.layers.values()) as obj}
									<Accordion.Item value="{obj.vector.vectorId}-item">
										<div class="grid w-full grid-cols-[auto_1fr] items-center gap-2">
											<Checkbox
												checked={mirrors.get('layerVisabilityInfo').get(obj.vector.vectorId)}
												id="{obj.vector.vectorId}-visibility-checkbox"
												onCheckedChange={(v) => {
													obj.vector.setVisibility(v);
													mirrors.get('layerVisabilityInfo').set(obj.vector.vectorId, v);
												}}
											/>
											<Accordion.Trigger>
												<span id="{obj.vector.name}-trigger-text" class="text-left"
													>{obj.vector.name}</span
												>
											</Accordion.Trigger>
										</div>
										<Accordion.Content class="ml-3"> 
											<div class="flex w-full items-center gap-3">
												<p>View options</p>
												{#if obj.vector.objectTypes.includes('point')}
													<PointViewOptions
														view={mirrors.get('layerPointViewInfo').get(obj.vector.vectorId)}
														onPointScaleChange={(v) => {
															obj.vector.setScale(v);
															mirrors.get('layerPointViewInfo').get(obj.vector.vectorId).scale =
																v;
														}}
														onFillOpacityChange={(v) => {
															obj.vector.setFillOpacity(v);
															mirrors
																.get('layerPointViewInfo')
																.get(obj.vector.vectorId).fillOpacity = v;
														}}
														onStrokeOpacityChange={(v) => {
															obj.vector.setStrokeOpacity(v);
															mirrors
																.get('layerPointViewInfo')
																.get(obj.vector.vectorId).strokeOpacity = v;
														}}
														onStrokeWidthChange={(v) => {
															obj.vector.setStrokeWidth(v);
															mirrors
																.get('layerPointViewInfo')
																.get(obj.vector.vectorId).strokeWidth = v;
														}}
														onStrokeColorChange={(v) => {
															obj.vector.setStrokeColor(v);
															mirrors
																.get('layerPointViewInfo')
																.get(obj.vector.vectorId).strokeColor = v;
														}}
													/>
												{/if}
												{#if obj.vector.objectTypes.includes('polygon')}
													<PolygonViewOptions
														view={mirrors.get('layerPolygonViewInfo').get(obj.vector.vectorId)}
														onFillOpacityChange={(v) => {
															obj.vector.setFillOpacity(v);
															mirrors
																.get('layerPolygonViewInfo')
																.get(obj.vector.vectorId).fillOpacity = v;
														}}
														onStrokeOpacityChange={(v) => {
															obj.vector.setStrokeOpacity(v);
															mirrors
																.get('layerPolygonViewInfo')
																.get(obj.vector.vectorId).strokeOpacity = v;
														}}
														onStrokeWidthChange={(v) => {
															obj.vector.setStrokeWidth(v);
															mirrors
																.get('layerPolygonViewInfo')
																.get(obj.vector.vectorId).strokeWidth = v;
														}}
														onStrokeColorChange={(v) => {
															obj.vector.setStrokeColor(v);
															mirrors
																.get('layerPolygonViewInfo')
																.get(obj.vector.vectorId).strokeColor = v;
														}}
														onApplyDarkenedBorder={(v) => {
															obj.vector.applyDarkenedBorder(v);
															mirrors
																.get('layerPolygonViewInfo')
																.get(obj.vector.vectorId).strokeDarkness = v;
														}}
													/>
												{/if}
											</div>
											<Card.Root>
												<Card.Header class="p-1">
													<Card.Title class="text-md">Active Metadata</Card.Title>
												</Card.Header>
												<Card.Content class="p-1 pt-0">
													
													<LayerOptions
														layer={obj}
														getCurrentObjectType={() => obj.vector.getCurrentObjectType(map)}
														onMetadataChange={async (metadataName) => {
															await obj.vector.setMetadata(metadataName, obj.metadataToNode.get(metadataName), map);
														}}
														onPaletteChange={(palette) => obj.vector.setPalette(palette)}
														onFieldColorChange={(fieldName, hex) =>
															obj.vector.setFeatureFillColor(fieldName, hex)}
														onFieldShapeChange={(fieldName, shape) =>
															obj.vector.setFeatureShapeType(fieldName, shape)}
														onFieldPaletteChange={(fieldName, palette) => obj.vector.setPalette(palette)}
														onFieldVisibilityChange={(fieldName, isVisible) =>
															toggleFeature(fieldName, obj.vector, isVisible)}
														onFieldVMinChange={(fieldName, vMin) => obj.vector.setVMin(fieldName, vMin)}
														onFieldVMaxChange={(fieldName, vMax) => obj.vector.setVMax(fieldName, vMax)}
														onFieldVCenterChange={(fieldName, vCenter) => obj.vector.setVCenter(fieldName, vCenter)}
													/>
													
												</Card.Content>
											</Card.Root>
										</Accordion.Content>
									</Accordion.Item>
								{/each}
							</Accordion.Root>
						</Card.Content>
					</Card.Root>
				</ScrollArea>
			{/key}
		{/if}
	</div>
</div>

<!-- on:change={(e) => updateMaxValue(obj.image, channelName, e)} -->

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
		z-index: 10;
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
