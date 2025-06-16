<script lang="ts">
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

	import { initZarr } from '../openlayers/ZarrHelpers';
	import { Image } from '../openlayers/Image';
	import { FeatureGroupVector, FeatureVector } from '../openlayers/Vector';
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
		imagesLoaded: boolean;
		layersLoaded: boolean;
		baseImage: null;
		experimentObj: any;
		imageOrder: any[];
		layerOrder: any[];
		layerToIsGrouped: globalThis.Map<any, any>;
		images: globalThis.Map<any, any>;
		layers: globalThis.Map<any, any>;
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
		// for (const [k, layer] of experiment.layers) {
		// 	let info = document.getElementById('info'); // this needs to be fixed
		// 	layer.vector.setFeatureToolTip(map, info);
		// }

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

<Accordion.Root>
	<Accordion.Item value="item-2">
		<Accordion.Trigger>{'hello'}</Accordion.Trigger>
		<Accordion.Content>{'world'}</Accordion.Content>
	</Accordion.Item>
</Accordion.Root>
