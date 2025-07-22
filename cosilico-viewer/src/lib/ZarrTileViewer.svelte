<script>
	import { onMount } from "svelte";
	import Map from "ol/Map.js";
	import View from "ol/View.js";
	import { SvelteMap } from "svelte/reactivity";
	import OverviewMap from "ol/control/OverviewMap.js";
	import { defaults as defaultControls } from "ol/control/defaults.js";
	import { Projection } from "ol/proj.js";
	import MouseWheelZoom from "ol/interaction/MouseWheelZoom.js";
	import PinchZoom from "ol/interaction/PinchZoom.js";
	import DoubleClickZoom from "ol/interaction/DoubleClickZoom.js";

	import * as Accordion from "$lib/components/ui/accordion/index.js";
	import Button from "./components/ui/button/button.svelte";
	import * as Card from "$lib/components/ui/card/index.js";
	import { Checkbox } from "$lib/components/ui/checkbox/index.js";
	import { Input } from "./components/ui/input/index.js";
	import { Slider } from "$lib/components/ui/slider/index.js";
	import { Circle2 } from "svelte-loading-spinners";
	import SwatchSelector from "./components/ui/swatch-selector/SwatchSelector.svelte";
	import PointViewOptions from "./sidebar/PointViewOptions.svelte";
	import PolygonViewOptions from "./sidebar/PolygonViewOptions.svelte";
	import FilterOptions from "./sidebar/FilterOptions.svelte";

	import LayerOptions from "./sidebar/LayerOptions.svelte";
	import { initZarr } from "./openlayers/ZarrHelpers.js";
	import { Image } from "./openlayers/Image.js";
	import { FeatureGroupVector, FeatureVector } from "./openlayers/Vector.js";
	import ZoomPanel from "./zooming/ZoomPanel.svelte";
	import Topbar from "./topbar/Topbar.svelte";
	import { captureScreen } from "./openlayers/OpenlayersHelpers.js";
	import * as Alert from "$lib/components/ui/alert/index.js";

	import Info from "@lucide/svelte/icons/info";
	import Camera from "@lucide/svelte/icons/camera";
    import { List } from "./components/ui/breadcrumb/index.js";

	let { experimentObj, supabase } = $props();

	let reloadImageInfoKey = $state(true);
	let reloadLayerInfoKey = $state(true);
	let metadataChangeKey = $state(true);
	let zoomChangeKey = $state(true);
	let mapIsLoading = $state(true);
	let map;
	let experiment = $state(null);
	let mirrors = $state(null);

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
			this.currentInsertionIdx = 0;
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

		incrementInsertionIndices(id, increment = 1) {
			let ids = [...this.imageOrder, ...this.layerOrder];

			let doIncrement = false;
			for (const objId of ids) {
				let obj;
				if (this.imageOrder.includes(objId)) {
					obj = this.images.get(objId).image;
				} else {
					obj = this.layers.get(objId).vector;
				}

				if (objId == id) {
					doIncrement = true;
				}

				if (doIncrement) {
					obj.insertionIdx = obj.insertionIdx + increment;
				}
			}

			this.currentInsertionIdx = this.currentInsertionIdx + increment;
		}

		exportViewSettings() {
			let viewSettings = {};

			let imgSettings = {};
			for (const img of this.experimentObj.images) {
				let o = { ...img.view_settings };
				const view = this.images.get(img.id).image.imageView;
				o.is_visible = this.images.get(img.id).image.isVisible;
				o.opacity = view.opacity;
				o.t_index = view.tIndex;
				o.z_index = view.zIndex;
				o.visible_channels = view.visibleChannelNames;
				o.channel_views = {};

				for (const name of view.interactedChannelNames) {
					const channel_view = view.channelNameToView.get(name);
					o.channel_views[name] = {
						min_value: channel_view.minValue,
						max_value: channel_view.maxValue,
						gamma: channel_view.gamma,
						color: channel_view.color,
					};
				}
				imgSettings[img.id] = o;
			}
			viewSettings.image_views = imgSettings;

			let layerSettings = {};
			for (const layer of this.experimentObj.layers) {
				let o = { ...layer.view_settings };
				const vector = this.layers.get(layer.id).vector;
				const view = vector.vectorView;
				o.is_visible = vector.isVisible;
				o.fill_opacity = view.fillOpacity;
				o.stroke_opacity = view.strokeOpacity;
				o.stroke_color = view.strokeColor;
				o.stroke_width = view.strokeWidth;
				o.scale = view.scale;

				// console.log('layer', layer);
				if (layer.is_grouped) {
					o.visible_feature_names = view.visibleFeatureNames;
					o.feature_styles = {};

					for (const featureName of view.interactedFeatureNames) {
						const fv = view.featureNameToView.get(featureName);
						o.feature_styles[featureName] = {
							shape_type: fv.shapeType,
							fill_color: fv.fillColor,
						};
					}		
				} else {
					o.visible_field = view.visibleFields[0];
					o.palette = view.palette;
					o.stroke_darkness = view.strokeDarkness;
					o.border_type = view.borderType;
				}

				layerSettings[layer.id] = o;
			}
			viewSettings.layer_views = layerSettings;

			let layerMetadataSettings = {};
			const ls = this.experimentObj.layers.filter((l) => l.is_grouped == false);
			for (const layer of ls) {
				const vector = this.layers.get(layer.id).vector;
				const metadataToNode = this.layers.get(layer.id).metadataToNode;

				const lms = layer.layer_metadatas.filter((lm) => lm.layer_id == layer.id);
				for (const lm of lms) {
					const name = lm.name;
					const node = metadataToNode.get(name);

					let view;
					if (vector.metadataName == name) {
						view = vector.vectorView;
					} else {
						view = vector.metadataToView.get(name);
					} 

					let o = { ...lm.view_settings };
					if (view) {
						o = {
							...o,
							is_visible: name == vector.metadataName,
							fill_opacity: view.fillOpacity,
							stroke_opacity: view.strokeOpacity,
							stroke_color: view.strokeColor,
							stroke_width: view.strokeWidth,
							scale: view.scale,
							stroke_darkness: view.strokeDarkness,
							border_type: view.border_type,
							palette: view.palette
						};

						if (node.attrs.type == 'continuous') {
							o.kind = 'continuous';
							o.visible_field = view.visibleFields[0];

							const fIndices = view.interactedFieldIndices;
							const fNames = view.interactedFieldNames;
							let fieldToVInfo = lm.view_settings?.field_value_info ?? {};
							for (let i = 0; i < fIndices.length; i++) {
								const fName = fNames[i];
								const fIndex = fIndices[i];
								const vinfo = view.fieldToVInfo.get(fIndex);


								fieldToVInfo[fName] = {
									v_min: vinfo.vMin,
									v_max: vinfo.vMax,
									v_center: vinfo.vCenter,
									v_step_size: vinfo.vStepSize
								};
							}
							o.field_value_info = fieldToVInfo;

							const fv = view.featureView;
							o.feature_style = {
								shape_type: fv.shapeType,
								fill_color: null,
							};
						} else {
							o.kind = 'categorical'
							o.visible_fields = view.visibleFields;
							o.field_styles = lm.view_settings?.field_styles ?? {}
							for (const field of view.interactedFieldNames) {
								const v = view.fieldToView.get(field);
								o.field_styles[field] = {
									fill_color: v.fillColor,
									shape_type: v.shapeType
								};
							}
						}
					}
					layerMetadataSettings[lm.id] = o;
				}
			}
			viewSettings.layer_metadata_views = layerMetadataSettings;

			return viewSettings;
		}

		async loadImages() {
			for (let i = 0; i < this.experimentObj.images.length; i++) {
				const img = this.experimentObj.images[i];
				const node = await initZarr({
					getUrl: img.path,
					headUrl: img.path_presigned_head,
				});
				const obj = {
					image: await Image.create(
						node,
						img.id,
						i == 0 ? true : false,
						this.currentInsertionIdx,
						img.view_settings,
						map,
					),
				};
				this.currentInsertionIdx = this.currentInsertionIdx + 1;
				this.images.set(img.id, obj);
				this.imageOrder.push(img.id);
			}

			this.baseImage = this.images.get(this.imageOrder[0]).image;
			// this.baseImage.isBaseImage = true;
			// this.baseImage.isVisible = true;

			this.imagesLoaded = true;
		}

		async loadGroupedLayer(gl) {
			const node = await initZarr({
				getUrl: gl.path,
				headUrl: gl.path_presigned_head,
			});

			let featureMetaToNode = new globalThis.Map();
			for (const mgl of gl.layer_metadatas) {
				const metadataNode = await initZarr({
					getUrl: mgl.path,
					headUrl: mgl.path_presigned_head,
				});
				// const metadataNode = await initZarr(mgl.path);
				featureMetaToNode.set(metadataNode.attrs.name, metadataNode);
			}
			// console.log('view settings', gl.view_settings);
			const fgv = await FeatureGroupVector.create(
				node,
				gl.id,
				featureMetaToNode,
				this.baseImage,
				this.currentInsertionIdx,
				gl.view_settings,
				map,
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

			for (const fname in fgv.vectorView?.visibleFeatureNames) {
				this.currentInsertionIdx++;
				fgv.insertionIdx++;
			}
		}

		async loadLayer(l) {
			// const node = await initZarr(l.path);
			const node = await initZarr({
				getUrl: l.path,
				headUrl: l.path_presigned_head,
			});

			const fv = await FeatureVector.create(
				node,
				l.id,
				this.baseImage,
				this.currentInsertionIdx,
				l.view_settings,
				map
			);

			let featureMetaToNode = new globalThis.Map();
			let featureMetaToViewSettings = new globalThis.Map();
			for (const mgl of l.layer_metadatas) {
				const metadataNode = await initZarr({
					getUrl: mgl.path,
					headUrl: mgl.path_presigned_head,
				});
				featureMetaToNode.set(metadataNode.attrs.name, metadataNode);
				featureMetaToViewSettings.set(metadataNode.attrs.name, mgl.view_settings);

				if (mgl.view_settings.is_visible) {
					await fv.setMetadata(mgl.name, metadataNode, map, mgl.view_settings)
				}
			}

			const obj = {
				vector: fv,
				metadataToNode: featureMetaToNode,
				metadataToViewSettings: featureMetaToViewSettings,
				viewSettings: l.view_settings,
				isGrouped: false,
			};

			this.layers.set(l.id, obj);
			this.layerOrder.push(l.id);
			this.layerToIsGrouped.set(l.id, false);

			this.currentInsertionIdx++;
			fv.insertionIdx++;

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

		// async initializeLayerMetadata(map) {
		// 	for (const [k, v] of this.layers) {
		// 		if (!v.isGrouped) {
		// 			await v.vector.setMetadata(null, null, map);
		// 			this.incrementInsertionIndices(v.vector.vectorId);
		// 		}
		// 	}
		// }
	}

	async function createMap(baseImage) {
		const node = await initZarr({
			getUrl: baseImage.path,
			headUrl: baseImage.path_presigned_head,
		});
		const sizeX = node.attrs.ome.images[0].pixels.size_x;
		const sizeY = node.attrs.ome.images[0].pixels.size_y;

		const projection = new Projection({
			code: "PIXEL",
			units: "pixels",
			extent: [0, 0, sizeX, sizeY],
		});

		// Create the new map
		map = new Map({
			target: "map",
			view: new View({
				projection: projection,
				center: [sizeX / 2, sizeY / 2],
				zoom: 1,
			}),
		});

		map.on("moveend", () => {
			if (experiment == null) {
				return null;
			}

			for (const [_, image] of experiment.images) {
				image.image.updateResolutionInfo(map);
			}

			if (mirrors != null) {
				mirrors.get("zoomPanelInfo").currentZoom =
					experiment.baseImage.currentZoom;
			}

			for (const [_, layer] of experiment.layers) {
				// update current res
				layer.vector.updateResolutionInfo(map);

				// do filter synching
				layer.vector.updateLayerFilterGeoms();
				if (layer.vector.maskingMap.size > 0) {
					layer.vector.restyleLayers();
				}
			}
		});

		map.on("loadstart", () => {
			mapIsLoading = true;
		});

		map.on("loadend", () => {
			mapIsLoading = false;
		});

		const mouseWheel = map
			.getInteractions()
			.getArray()
			.find((i) => i instanceof MouseWheelZoom);

		if (mouseWheel) {
			// mouseWheel.on('change:active', () => {
			// 	console.log('MouseWheelZoom toggled');
			// });

			// To track wheel usage, use the event handler override
			const originalHandleEvent = mouseWheel.handleEvent.bind(mouseWheel);

			mouseWheel.handleEvent = function (event) {
				if (event.type === "wheel") {
					for (const [_, image] of experiment.images) {
						image.image.updateResolutionInfo(map);
					}
					if (mirrors != null) {
						mirrors.get("zoomPanelInfo").currentZoom =
							experiment.baseImage.currentZoom;
					}
					zoomChangeKey = !zoomChangeKey;
				}
				return originalHandleEvent(event);
			};
		}
	}

	function initializeMirrors() {
		// channel view info
		mirrors = new SvelteMap();

		let imageDisplayInfo = $state(new SvelteMap());
		for (const [imageId, obj] of experiment.images) {
			let channelToInfo = $state(new SvelteMap());
			for (const [channelName, view] of obj.image.imageView
				.channelNameToView) {
				let info = $state({
					minValue: view.minValue,
					maxValue: view.maxValue,
					gamma: view.gamma,
					color: view.color,
				});
				channelToInfo.set(channelName, info);
			}
			imageDisplayInfo.set(imageId, channelToInfo);
		}

		let imageSwatches = $state(new SvelteMap());
		for (const [imageId, obj] of experiment.images) {
			let channelSwatches = $state([]);
			for (const [channelName, view] of obj.image.imageView
				.channelNameToView) {
				channelSwatches.push(view.color);
			}
			imageSwatches.set(imageId, channelSwatches);
		}

		let imageVisibilityInfo = $state(new SvelteMap());
		for (const [imageId, obj] of experiment.images) {
			imageVisibilityInfo.set(imageId, obj.image.isVisible);
		}

		// let imageResolutionInfo = $state(new SvelteMap());
		// for (const [imageId, obj] of experiment.images) {
		// 	imageResolutionInfo.set('currentUpp', obj.image.currentUpp);
		// }

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
				strokeColor: obj.vector.vectorView.strokeColor,
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
				borderType: obj.vector.vectorView.borderType,
			});
			layerPolygonViewInfo.set(vectorId, view);
		}

		let layerMetadataFilters = $state(new SvelteMap());
		for (const [vectorId, obj] of experiment.layers) {
			let filters = new SvelteMap();
			for (const [metadataName, filter] of obj.vector.filterMap) {
				for (const [key, operator] of filter.operations) {
					const key =
						metadataName +
						"-" +
						operator.field +
						"-" +
						operator.symbol;
					filters.set(key, {
						metadataName: metadataName,
						metadataField: operator.field,
						symbol: operator.symbol,
						value: operator.value,
					});
				}
			}
			layerMetadataFilters.set(vectorId, filters);
		}

		let layerLayerFilters = $state(new SvelteMap());
		for (const [vectorId, obj] of experiment.layers) {
			let filters = new SvelteMap();
			for (const [layerName, filter] of obj.vector.maskingMap) {
				const key = layerName + "-" + filter.symbol;
				filters.set(key, {
					layerName: layerName,
					layerId: filter.layerId,
					symbol: filter.symbol,
				});
			}
			layerLayerFilters.set(vectorId, filters);
		}

		mirrors.set("imageDisplayInfo", imageDisplayInfo);
		mirrors.set("imageSwatches", imageSwatches);
		mirrors.set("imageVisabilityInfo", imageVisibilityInfo);
		mirrors.set("layerVisabilityInfo", layerVisabilityInfo);
		mirrors.set("layerPointViewInfo", layerPointViewInfo);
		mirrors.set("layerPolygonViewInfo", layerPolygonViewInfo);
		mirrors.set("layerMetadataFilters", layerMetadataFilters);
		mirrors.set("layerLayerFilters", layerLayerFilters);
		mirrors.set("zoomPanelInfo", {
			currentZoom: experiment.baseImage.currentZoom,
			isLocked: false,
			upp: experiment.baseImage.upp,
			unit: experiment.baseImage.unit,
			minZoom: 0.01,
			maxZoom:
				(experiment.baseImage.resolutions[0] /
					experiment.baseImage.tileSize) *
				2,
		});
	}

	onMount(async () => {
		const baseImage = experimentObj.images[0];

		await createMap(baseImage);

		experiment = await Experiment.create(experimentObj);

		// first channel of first image visible by default
		if (experiment.baseImage.imageView.visibleChannelNames.length == 0) {
			await experiment.baseImage.addChannel(
				experiment.baseImage.channelNames[0],
				map,
			);
		}
		
		initializeMirrors();

		reloadImageInfoKey = !reloadImageInfoKey;
		reloadLayerInfoKey = !reloadLayerInfoKey;
		mapIsLoading = false;
	});

	function toggleFeature(featureName, vector, isVisible) {
		let visible;
		if (vector instanceof FeatureVector) {
			visible = vector.vectorView.visibleFields;
		} else {
			visible = vector.vectorView.visibleFeatureNames;
		}

		let doIncrement = vector instanceof FeatureGroupVector;

		if (visible.includes(featureName)) {
			vector.removeFeature(featureName, map);

			if (doIncrement) {
				experiment.incrementInsertionIndices(vector.vectorId, -1);
			}
		} else {
			vector.addFeature(featureName, map);
			if (doIncrement) {
				experiment.incrementInsertionIndices(vector.vectorId);
			}
		}

		// reloadLayerInfoKey = !reloadLayerInfoKey;
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
	}

	function changeChannelColor(channelName, image, value) {
		image.setChannelColor(channelName, value);
		mirrors
			.get("imageDisplayInfo")
			.get(image.imageId)
			.get(channelName).color = value;

		image.updateBeforeOperations();
		if (image.isBaseImage) {
			image.updateOverviewMapLayerOperations();
		}
	}

	function getMinThresholdValue(image, channelName) {
		return mirrors
			.get("imageDisplayInfo")
			.get(image.imageId)
			.get(channelName).minValue;
	}
	function getMaxThresholdValue(image, channelName) {
		return mirrors
			.get("imageDisplayInfo")
			.get(image.imageId)
			.get(channelName).maxValue;
	}
	function setMinThresholdValue(image, channelName, value) {
		let view = image.imageView.channelNameToView.get(channelName);
		value = Number(value);
		if (value >= view.maxValue) {
			value = view.maxValue - 1;
		}
		view.minValue = value;

		let info = mirrors
			.get("imageDisplayInfo")
			.get(image.imageId)
			.get(channelName);
		info.minValue = value;

		image.updateBeforeOperations();
		if (image.isBaseImage) {
			image.updateOverviewMapLayerOperations();
		}

		image.updateInteractedChannel(channelName);
	}
	function setMaxThresholdValue(image, channelName, value) {
		let view = image.imageView.channelNameToView.get(channelName);
		value = Number(value);
		if (value <= view.minValue) {
			value = view.minValue + 1;
		}
		view.maxValue = value;

		let info = mirrors
			.get("imageDisplayInfo")
			.get(image.imageId)
			.get(channelName);
		info.maxValue = value;

		image.updateBeforeOperations();
		if (image.isBaseImage) {
			image.updateOverviewMapLayerOperations();
		}

		image.updateInteractedChannel(channelName);
	}

	function getThresholdValues(image, channelName) {
		const info = mirrors
			.get("imageDisplayInfo")
			.get(image.imageId)
			.get(channelName);
		const minValue = info.minValue;
		const maxValue = info.maxValue;
		return [minValue, maxValue];
	}

	function setThresholdValues(image, channelName, values) {
		let info = mirrors
			.get("imageDisplayInfo")
			.get(image.imageId)
			.get(channelName);
		info.minValue = values[0];
		info.maxValue = values[1];

		let view = image.imageView.channelNameToView.get(channelName);
		view.minValue = values[0];
		view.maxValue = values[1];

		image.updateBeforeOperations();
		if (image.isBaseImage) {
			image.updateOverviewMapLayerOperations();
		}

		image.updateInteractedChannel(channelName);
	}
</script>

<div class="h-full">
	<!-- <div id="info" class="ol-tooltip hidden"></div> -->

	<div id="map" class="bg-black w-full h-full relative"></div>
	{#key mapIsLoading}
		{#if mapIsLoading}
			<div
				class="absolute inset-0 flex items-center justify-center z-51 pointer-events-none">
				<Circle2
					size="80"
					colorInner="#FF0000"
					colorCenter="#00FF00"
					colorOuter="#0000FF"
					unit="px" />
			</div>
		{/if}
	{/key}

	{#if experiment && mirrors != null}
		{#key reloadImageInfoKey}
			<Topbar 
				onSaveViewSettings = {async () => {
					const body = experiment.exportViewSettings();
					const { error } = await supabase
						.from('view_settings')
						.update({ settings: body })
						.eq('id', experiment.experimentObj.view_settings.id)

					if (error) console.error(error);
				}}
				onExportViewSettings = {async (name) => {
					const body = experiment.exportViewSettings();
					console.log('exporting', body);
					const { error } = await supabase
						.from('view_settings')
						.insert({ 
							name: name,
							is_exported: true,
							settings: body 
						})
						
					if (error) console.error(error);
				}}
				onCaptureScreen = {() => captureScreen(map, experiment)}
			    />
			<div
				class="absolute right-4 top-4 bottom-16 w-96 z-50 overflow-y-auto">
				<Card.Root class="w-full gap-0">
					<Card.Header>
						<Card.Title class="text-xl">Images</Card.Title>
					</Card.Header>
					<Card.Content>
						<Accordion.Root type="single">
							{#each Array.from(experiment.images.values()) as obj}
								<Accordion.Item
									value="{obj.image.imageId}-item">
									<div
										class="grid w-full grid-cols-[auto_1fr] items-center gap-2">
										<Checkbox
											checked={mirrors
												.get("imageVisabilityInfo")
												.get(obj.image.imageId)}
											id="{obj.image
												.imageId}-visibility-checkbox"
											onCheckedChange={(v) => {
												obj.image.setVisibility(v);
												mirrors
													.get("imageVisabilityInfo")
													.set(obj.image.imageId, v);
											}} />
										<Accordion.Trigger>
											<span
												id="{obj.image
													.name}-trigger-text"
												class="text-left text-md"
												>{obj.image.name}</span>
										</Accordion.Trigger>
									</div>
									<Accordion.Content class="ml-3">
										{#if !mirrors
											.get("imageVisabilityInfo")
											.get(obj.image.imageId)}
											<Alert.Root>
												<Info class="size-4" />
												<Alert.Title>Info!</Alert.Title>
												<Alert.Description
													>Layer is hidden. Unhide to
													view.</Alert.Description>
											</Alert.Root>
										{/if}
										<Accordion.Root>
											{#each obj.image.channelNames as channelName}
												<Accordion.Item
													value="{obj.image
														.imageId}-{channelName}-item">
													<div
														class="grid w-full grid-cols-[auto_1fr] items-center gap-2">
														<div
															class="flex items-center gap-2">
															<Checkbox
																checked={obj.image.imageView.visibleChannelNames.includes(
																	channelName,
																)}
																onCheckedChange={(
																	v,
																) =>
																	toggleChannel(
																		channelName,
																		obj.image,
																	)} />
															<SwatchSelector
																hex={mirrors
																	.get(
																		"imageDisplayInfo",
																	)
																	.get(
																		obj
																			.image
																			.imageId,
																	)
																	.get(
																		channelName,
																	).color}
																swatchHexs={mirrors
																	.get(
																		"imageSwatches",
																	)
																	.get(
																		obj
																			.image
																			.imageId,
																	)}
																onColorSelection={(
																	value,
																) =>
																	changeChannelColor(
																		channelName,
																		obj.image,
																		value,
																	)} />
														</div>
														<Accordion.Trigger>
															<span
																id="{obj.image
																	.imageId}-{channelName}-text"
																class="text-left"
																>{channelName}</span>
														</Accordion.Trigger>
													</div>
													<Accordion.Content
														class="ml-3">
														<Card.Root class="p-1">
															<Card.Header
																class="p-1">
																<Card.Title
																	class="text-sm"
																	>Intensity
																	Threshold</Card.Title>
																<!-- <Card.Description>Intensity Threshold</Card.Description> -->
															</Card.Header>
															<Card.Content
																class="p-1 pt-0">
																<div
																	class="flex w-full items-center gap-3">
																	<Input
																		type="number"
																		value={mirrors
																			.get(
																				"imageDisplayInfo",
																			)
																			.get(
																				obj
																					.image
																					.imageId,
																			)
																			.get(
																				channelName,
																			)
																			.minValue}
																		onchange={(
																			e,
																		) =>
																			setMinThresholdValue(
																				obj.image,
																				channelName,
																				e
																					.target
																					.value,
																			)}
																		class="w-[70px] px-1 text-left" />
																	<Slider
																		bind:value={
																			() =>
																				getThresholdValues(
																					obj.image,
																					channelName,
																				),
																			(
																				vs,
																			) =>
																				setThresholdValues(
																					obj.image,
																					channelName,
																					vs,
																				)
																		}
																		min={obj
																			.image
																			.dtypeMin}
																		max={obj
																			.image
																			.dtypeMax}
																		step={1}
																		class="flex-1" />
																	<Input
																		type="number"
																		value={mirrors
																			.get(
																				"imageDisplayInfo",
																			)
																			.get(
																				obj
																					.image
																					.imageId,
																			)
																			.get(
																				channelName,
																			)
																			.maxValue}
																		onchange={(
																			e,
																		) =>
																			setMaxThresholdValue(
																				obj.image,
																				channelName,
																				e
																					.target
																					.value,
																			)}
																		class="w-[70px] px-1 text-left" />
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
				<Card.Root class="w-full gap-0">
					<Card.Header>
						<Card.Title class="text-xl">Layers</Card.Title>
					</Card.Header>
					<Card.Content>
						<Accordion.Root type="single">
							{#each Array.from(experiment.layers.values()) as obj}
								<Accordion.Item
									value="{obj.vector.vectorId}-item">
									<div
										class="grid w-full grid-cols-[auto_1fr] items-center gap-2">
										<Checkbox
											checked={mirrors
												.get("layerVisabilityInfo")
												.get(obj.vector.vectorId)}
											id="{obj.vector
												.vectorId}-visibility-checkbox"
											onCheckedChange={(v) => {
												obj.vector.setVisibility(v);
												mirrors
													.get("layerVisabilityInfo")
													.set(
														obj.vector.vectorId,
														v,
													);
											}} />
										<Accordion.Trigger>
											<span
												id="{obj.vector
													.name}-trigger-text"
												class="text-left"
												>{obj.vector.name}</span>
										</Accordion.Trigger>
									</div>
									<Accordion.Content class="ml-3">
										{#if !mirrors
											.get("layerVisabilityInfo")
											.get(obj.vector.vectorId)}
											<Alert.Root>
												<Info class="size-4" />
												<Alert.Title>Info!</Alert.Title>
												<Alert.Description
													>Layer is hidden. Unhide to
													view.</Alert.Description>
											</Alert.Root>
										{/if}
										{#key metadataChangeKey}
											<div
												class="flex w-full items-center gap-3">
												<p>View options</p>
												{#if obj.vector.objectTypes.includes("point")}
													<PointViewOptions
														view={mirrors
															.get(
																"layerPointViewInfo",
															)
															.get(
																obj.vector
																	.vectorId,
															)}
														onPointScaleChange={(
															v,
														) => {
															obj.vector.setScale(
																v,
															);
															mirrors
																.get(
																	"layerPointViewInfo",
																)
																.get(
																	obj.vector
																		.vectorId,
																).scale = v;
														}}
														onFillOpacityChange={(
															v,
														) => {
															obj.vector.setFillOpacity(
																v,
															);
															mirrors
																.get(
																	"layerPointViewInfo",
																)
																.get(
																	obj.vector
																		.vectorId,
																).fillOpacity =
																v;
														}}
														onStrokeOpacityChange={(
															v,
														) => {
															obj.vector.setStrokeOpacity(
																v,
															);
															mirrors
																.get(
																	"layerPointViewInfo",
																)
																.get(
																	obj.vector
																		.vectorId,
																).strokeOpacity =
																v;
														}}
														onStrokeWidthChange={(
															v,
														) => {
															obj.vector.setStrokeWidth(
																v,
															);
															mirrors
																.get(
																	"layerPointViewInfo",
																)
																.get(
																	obj.vector
																		.vectorId,
																).strokeWidth =
																v;
														}}
														onStrokeColorChange={(
															v,
														) => {
															obj.vector.setStrokeColor(
																v,
															);
															mirrors
																.get(
																	"layerPointViewInfo",
																)
																.get(
																	obj.vector
																		.vectorId,
																).strokeColor =
																v;
														}} />
												{/if}
												{#if obj.vector.objectTypes.includes("polygon")}
													<PolygonViewOptions
														view={mirrors
															.get(
																"layerPolygonViewInfo",
															)
															.get(
																obj.vector
																	.vectorId,
															)}
														onFillOpacityChange={(
															v,
														) => {
															obj.vector.setFillOpacity(
																v,
															);
															mirrors
																.get(
																	"layerPolygonViewInfo",
																)
																.get(
																	obj.vector
																		.vectorId,
																).fillOpacity =
																v;
														}}
														onStrokeOpacityChange={(
															v,
														) => {
															obj.vector.setStrokeOpacity(
																v,
															);
															mirrors
																.get(
																	"layerPolygonViewInfo",
																)
																.get(
																	obj.vector
																		.vectorId,
																).strokeOpacity =
																v;
														}}
														onStrokeWidthChange={(
															v,
														) => {
															obj.vector.setStrokeWidth(
																v,
															);
															mirrors
																.get(
																	"layerPolygonViewInfo",
																)
																.get(
																	obj.vector
																		.vectorId,
																).strokeWidth =
																v;
														}}
														onStrokeColorChange={(
															v,
														) => {
															obj.vector.setStrokeColor(
																v,
															);
															mirrors
																.get(
																	"layerPolygonViewInfo",
																)
																.get(
																	obj.vector
																		.vectorId,
																).strokeColor =
																v;
														}}
														onBorderColoring={(
															v,
														) => {
															obj.vector.setBorderColoring(
																v,
															);
															mirrors
																.get(
																	"layerPolygonViewInfo",
																)
																.get(
																	obj.vector
																		.vectorId,
																).strokeDarkness =
																v;
														}}
														onBorderTypeChange={(
															v,
														) => {
															obj.vector.setBorderType(
																v,
															);
															let info = mirrors
																.get(
																	"layerPolygonViewInfo",
																)
																.get(
																	obj.vector
																		.vectorId,
																);
															info.borderType = v;
														}} />
												{/if}
												<FilterOptions
													layer={obj}
													layers={experiment.layers}
													vectorToGeomType={(v) =>
														v.getCurrentObjectType(
															map,
														)}
													metadataFilters={mirrors
														.get(
															"layerMetadataFilters",
														)
														.get(
															obj.vector.vectorId,
														)}
													layerFilters={mirrors
														.get(
															"layerLayerFilters",
														)
														.get(
															obj.vector.vectorId,
														)}
													onAddFilterMetadata={async (
														metadataName,
													) => {
														await obj.vector.addMetadataFilter(
															metadataName,
															obj.metadataToNode.get(
																metadataName,
															),
															map,
														);
													}}
													onAddMetadataFilter={(
														metadataFilter,
													) => {
														const key =
															metadataFilter.metadataName +
															"-" +
															metadataFilter.fieldName +
															"-" +
															metadataFilter.symbol;
														obj.vector.addMetadataFilterOperation(
															metadataFilter.metadataName,
															metadataFilter.fieldName,
															key,
															metadataFilter.symbol,
															metadataFilter.value,
														);
														let mapping = mirrors
															.get(
																"layerMetadataFilters",
															)
															.get(
																obj.vector
																	.vectorId,
															);
														mapping.set(
															key,
															metadataFilter,
														);
													}}
													onRemoveMetadataFilter={async (
														metadataFilter,
													) => {
														const key =
															metadataFilter.metadataName +
															"-" +
															metadataFilter.fieldName +
															"-" +
															metadataFilter.symbol;
														obj.vector.removeMetadataFilterOperation(
															metadataFilter.metadataName,
															key,
														);

														if (
															obj.vector.filterMap.get(
																metadataFilter.metadataName,
															).operations
																.length == 0
														) {
															await obj.vector.removeMetadataFilter(
																metadataFilter.metadataName,
																map,
															);
														}

														let mapping = mirrors
															.get(
																"layerMetadataFilters",
															)
															.get(
																obj.vector
																	.vectorId,
															);
														mapping.delete(key);
													}}
													onAddLayerFilter={(
														layerFilter,
													) => {
														const key =
															layerFilter.layerName +
															"-" +
															layerFilter.symbol;
														obj.vector.addLayerFilter(
															layerFilter.layerName,
															experiment.layers.get(
																layerFilter.layerId,
															).vector,
															layerFilter.symbol,
															key,
															map,
														);
														let mapping = mirrors
															.get(
																"layerLayerFilters",
															)
															.get(
																obj.vector
																	.vectorId,
															);
														mapping.set(
															key,
															layerFilter,
														);
													}}
													onRemoveLayerFilter={(
														layerFilter,
													) => {
														const key =
															layerFilter.layerName +
															"-" +
															layerFilter.symbol;
														obj.vector.removeLayerFilter(
															key,
														);

														let mapping = mirrors
															.get(
																"layerLayerFilters",
															)
															.get(
																obj.vector
																	.vectorId,
															);
														mapping.delete(key);
													}} />
											</div>
										{/key}
										<Card.Root class="p-1 w-full gap-0">
											<Card.Header class="p-1">
												<Card.Title class="text-md"
													>Active Metadata</Card.Title>
											</Card.Header>
											<Card.Content class="p-1 pt-0">
												<LayerOptions
													layer={obj}
													getCurrentObjectType={() =>
														obj.vector.getCurrentObjectType(
															map,
														)}
													onMetadataChange={async (
														metadataName,
													) => {
														await obj.vector.setMetadata(
															metadataName,
															obj.metadataToNode.get(
																metadataName,
															),
															map,
															obj.metadataToViewSettings.get(metadataName)
														);

														// we need to resynch view options
														let info = mirrors
															.get(
																"layerPolygonViewInfo",
															)
															.get(
																obj.vector
																	.vectorId,
															);
														info.fillOpacity =
															obj.vector.vectorView.fillOpacity;
														info.strokeOpacity =
															obj.vector.vectorView.strokeOpacity;
														info.strokeWidth =
															obj.vector.vectorView.strokeWidth;
														info.strokeColor =
															obj.vector.vectorView.strokeColor;
														info.strokeDarkness =
															obj.vector.vectorView.strokeDarkness;
														info.borderType =
															obj.vector.vectorView.borderType;

														info = mirrors
															.get(
																"layerPointViewInfo",
															)
															.get(
																obj.vector
																	.vectorId,
															);
														info.viewAs =
															obj.vector.getCurrentObjectType(
																map,
															);
														info.scale =
															obj.vector.vectorView.scale;
														info.fillOpacity =
															obj.vector.vectorView.fillOpacity;
														info.strokeOpacity =
															obj.vector.vectorView.strokeOpacity;
														info.strokeWidth =
															obj.vector.vectorView.strokeWidth;
														info.strokeColor =
															obj.vector.vectorView.strokeColor;
													}}
													onPaletteChange={(
														palette,
													) =>
														obj.vector.setPalette(
															palette,
														)}
													onFieldColorChange={(
														fieldName,
														hex,
													) =>
														obj.vector.setFeatureFillColor(
															fieldName,
															hex,
														)}
													onFieldShapeChange={(
														fieldName,
														shape,
													) =>
														obj.vector.setFeatureShapeType(
															fieldName,
															shape,
														)}
													onFieldPaletteChange={(
														fieldName,
														palette,
													) =>
														obj.vector.setPalette(
															palette,
														)}
													onFieldVisibilityChange={(
														fieldName,
														isVisible,
													) =>
														toggleFeature(
															fieldName,
															obj.vector,
															isVisible,
														)}
													onFieldVMinChange={(
														fieldName,
														vMin,
													) =>
														obj.vector.setVMin(
															fieldName,
															vMin,
														)}
													onFieldVMaxChange={(
														fieldName,
														vMax,
													) =>
														obj.vector.setVMax(
															fieldName,
															vMax,
														)}
													onFieldVCenterChange={(
														fieldName,
														vCenter,
													) =>
														obj.vector.setVCenter(
															fieldName,
															vCenter,
														)} />
											</Card.Content>
										</Card.Root>
									</Accordion.Content>
								</Accordion.Item>
							{/each}
						</Accordion.Root>
					</Card.Content>
				</Card.Root>
			</div>
		{/key}

		{#key zoomChangeKey}
			<div class="absolute right-4 bottom-4 w-96 z-50 overflow-y-auto">
				<ZoomPanel
					zoom={mirrors.get("zoomPanelInfo").currentZoom}
					isLocked={mirrors.get("zoomPanelInfo").isLocked}
					upp={mirrors.get("zoomPanelInfo").upp}
					unit={experiment.baseImage.unit}
					minZoom={mirrors.get("zoomPanelInfo").minZoom}
					maxZoom={mirrors.get("zoomPanelInfo").maxZoom}
					onZoomChange={(v) => {
						const view = map.getView();
						// view.setZoom(v);
						view.setResolution(v);
						mirrors.get("zoomPanelInfo").currentZoom = v;
					}}
					onLockedChange={(v) => {
						mirrors.get("zoomPanelInfo").isLocked = v;
						if (v) {
							map.getInteractions().forEach((interaction) => {
								if (
									interaction instanceof MouseWheelZoom ||
									interaction instanceof PinchZoom ||
									interaction instanceof DoubleClickZoom
								) {
									interaction.setActive(false);
								}
							});
						} else {
							map.getInteractions().forEach((interaction) => {
								if (
									interaction instanceof MouseWheelZoom ||
									interaction instanceof PinchZoom ||
									interaction instanceof DoubleClickZoom
								) {
									interaction.setActive(true);
								}
							});
						}
					}}
					step={0.01} />
			</div>
		{/key}
	{/if}
	<!-- </div> -->

</div>


<style global>
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
