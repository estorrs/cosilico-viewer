
import { open } from "@zarrita/core";
import { get, slice } from "@zarrita/indexing";
import { Projection } from 'ol/proj.js';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import { GeometryCollection } from "ol/geom.js";
import { SvelteMap } from "svelte/reactivity";
import { Style, Fill, Stroke } from "ol/style.js";


import { GroupedZarrVectorLoader, ZarrVectorLoader } from './ZarrVectorLoader.js';
import { generateColorMapping, defaultPalettes, valueToColor, hexToRgba, adjustHexLightness } from './ColorHelpers.js';
import { generateShape } from "./ShapeHelpers.js";
import { extractRows } from "./ZarrHelpers.js";
import { getClosestResolution } from "./OpenlayersHelpers.js";


export class FeatureGroupVector {
    constructor(
        node,
        vectorId,
        featureMetaToNode,
        baseImage,
        insertionIdx,
        viewSettings,
    ) {
        this.node = node;
        this.isVisible = viewSettings.is_visible;
        this.viewSettings = viewSettings;

        this.version = node.attrs.version;
        this.name = node.attrs.name;
        this.vectorId = vectorId;
        this.resolutions = this.node.attrs.resolutions.sort((a, b) => b - a);
        this.objectTypes = this.resolutions.map((res) => 'point'); // for now just prepopulate
        this.currentRes = this.resolutions[0];
        this.closestRes = this.resolutions[0];
        
        this.sizeY = baseImage.sizeY;
        this.sizeX = baseImage.sizeX;
        this.tileSize = baseImage.tileSize;
        this.upp = baseImage.upp;
        this.unit = baseImage.unit;
        this.currentZoom = this.resolutions[0] / this.tileSize;

        this.featureMetaToNode = featureMetaToNode;
        this.filterMap = new Map();
        this.maskingMap = new Map();
        this.visibleFeatures = [];
        this.resToFeatureInfo = new Map();

        this.insertionIdx = insertionIdx;

        this.currentFeature = undefined;

        this.isLoaded = false;

        this.projection = baseImage.projection

    }

    async init(map) {
        await this.populateInitialFields(map);
        return this;
    }

    static async create(node, vectorId, featureMetaToNode, baseImage, insertionIdx, viewSettings, map) {
        const instance = new FeatureGroupVector(node, vectorId, featureMetaToNode, baseImage, insertionIdx, viewSettings);
        return await instance.init(map);
    }

    createLayer(featureGroup) {
        const vectorLoader = new GroupedZarrVectorLoader(
            this.node,
            this.sizeY,
            this.sizeX,
            this.projection,
            this.tileSize,
            this.resolutions,
            featureGroup,
            this.featureMetaToNode
        );

        const vectorTileSource = vectorLoader.vectorTileSource;

        const vectorTileStyle = (feature) => {
            const idx = feature.values_.feature_index;
            const name = this.featureNames[idx];
            if (this.vectorView.visibleFeatureIndices.includes(idx) && this.featureIsVisible(feature)) {
                const fview = this.vectorView.featureNameToView.get(name);
                const info = this.resToFeatureInfo.get(this.closestRes);


                const maxCount = info.vmaxs[idx];
                // const maxCount = this.featureMetaToNode.get('count').attrs.vmax;
                const scaler = feature.values_.Count / maxCount;
                // const scaler = 1.;

                const shape = generateShape(fview.shapeType, this.vectorView.strokeWidth, hexToRgba(this.vectorView.strokeColor, this.vectorView.strokeOpacity), hexToRgba(fview.fillColor, this.vectorView.fillOpacity), this.vectorView.scale * scaler);
                return new Style({
                    // image: this.vectorView.featureNameToView.get(name).shape
                    image: shape
                });
            }
        }

        const layer = new VectorTileLayer({
            preload: 0,
            source: vectorTileSource,
            style: vectorTileStyle,
        });

        // layer.on('prerender', (event) => {
        // });
        // layer.on('postrender', (event) => {
        // });

        return layer;
    }

    updateResolutionInfo(map) {
        const current = map.getView().getResolution();
        this.currentZoom = current;
        this.currentRes = current * this.tileSize;
        this.closestRes = getClosestResolution(map, this.resolutions, this.tileSize);
    }

    restyleLayers() {
        this.visibleFeatures = [];
        for (const featureName of this.vectorView.visibleFeatureNames) {
            const l = this.featureNameToLayer.get(featureName);
            l.setStyle(l.getStyle());
        }
    }

    setFeatureMetadata(featureMetaToNode, map) {
        this.featureMetaToNode = featureMetaToNode

        for (let i = 0; i < this.vectorView.visibleFeatureNames.length; i++) {
            const featureName = this.vectorView.visibleFeatureNames[i];
            const featureGroup = this.vectorView.visibleFeatureGroups[i];
            const oldLayer = this.featureNameToLayer.get(featureName);

            // remove old layer
            const idx = map.getLayers().getArray().indexOf(oldLayer);
            map.removeLayer(oldLayer);
            this.featureNameToLayer.delete(featureName);

            // add new layer
            const layer = this.createLayer(featureGroup);
            // map.addLayer(layer);
            map.getLayers().insertAt(idx, layer);
            this.featureNameToLayer.set(featureName, layer);
        }
    }

    getCurrentObjectType(map) {
        const res = getClosestResolution(map, this.resolutions, this.tileSize);
        const idx = this.resolutions.indexOf(res);
        const objType = this.objectTypes[idx];
        return objType;
    }

    async addMetadataFilter(metadataName, map) {
        if (!this.filterMap.has(metadataName)) {
            const node = this.featureMetaToNode.get(metadataName);

            this.filterMap.set(metadataName, {
                metadataName: metadataName,
                metadataNode: node,
                metadataType: node.attrs.type,
                metadataFields: [metadataName],
                vmins: [node.attrs.vmin],
                vmaxs: [node.attrs.vmax],
                operations: new Map(),
            });
        }

    }

    async removeMetadataFilter(metadataName, map) {
        this.filterMap.delete(metadataName);
    }

    addMetadataFilterOperation(metadataName, field, key, symbol, value) {
        this.filterMap.get(metadataName).operations.set(key, {
            symbol: symbol,
            value: value,
            field: null,
            fieldIdx: null,
        });

        this.restyleLayers();
    }

    removeMetadataFilterOperation(metadataName, key) {
        this.filterMap.get(metadataName).operations.delete(key);

        this.restyleLayers();
    }

    addLayerFilter(layerName, layer, symbol, key, map) {
        if (layer.getCurrentObjectType(map) == 'polygon') {
            this.maskingMap.set(key, {symbol: symbol, name: layerName, layer: layer });
            this.updateLayerFilterGeoms();
            this.restyleLayers();
        }
    }

    removeLayerFilter(key) {
        this.maskingMap.delete(key);

        this.restyleLayers();
    }

    updateLayerFilterGeoms() {
        for (const [key, filter] of this.maskingMap) {
            filter.layer.activeGeometryCollection = new GeometryCollection(filter.layer.visibleFeatures.map(f => f.getGeometry()));
        }
    }

    updateInteractedFeature(featureName) {
        if (!this.vectorView?.interactedFeatureNames.includes(featureName)) {
            this.vectorView?.interactedFeatureNames.push(featureName);
        }
    }

    featureIsVisible(feature) {
        let passesMetadata = true;
        let passesLayer = true;
        const props = feature.values_;

        for (const [layerName, filter] of this.maskingMap) {

            const coord = feature.getGeometry().getCoordinates();

            const doesIntersect = filter.layer.activeGeometryCollection.intersectsCoordinate(coord);
            
            let passesOperation = false;
            if (doesIntersect && filter.symbol == 'is in') {
                passesOperation = true
            } else if (!doesIntersect && filter.symbol == 'is not in') {
                passesOperation = true
            }
            passesLayer = passesLayer && passesOperation;
        }

        for (const [metadataName, filter] of this.filterMap) {
            let passesOperation = false;
            const value = props[filter.metadataName];
            for (const [k, op] of filter.operations) {
                if (op.symbol == '=') {
                    passesOperation = value == op.value;
                } else if (op.symbol == '<=') {
                    passesOperation = value <= op.value;
                } else if (op.symbol == '<') {
                    passesOperation = value < op.value;
                } else if (op.symbol == '>=') {
                    passesOperation = value >= op.value;
                } else if (op.symbol == '>') {
                    passesOperation = value > op.value;
                }

                passesMetadata = passesMetadata && passesOperation;
            }
        }

        return passesMetadata && passesLayer;

    }

    addFeature(featureName, map) {
        const featureIndex = this.featureNames.indexOf(featureName);
        const featureGroup = this.featureGroups[featureIndex];

        const layer = this.createLayer(featureGroup);
        layer.setVisible(this.isVisible);

        map.getLayers().insertAt(this.insertionIdx, layer);

        this.featureNameToLayer.set(featureName, layer);

        this.vectorView.visibleFeatureIndices.push(featureIndex);
        this.vectorView.visibleFeatureGroups.push(featureGroup);
        this.vectorView.visibleFeatureNames.push(featureName);

        this.updateInteractedFeature(featureName);
    }

    removeFeature(featureName, map) {
        const featureIndex = this.vectorView.visibleFeatureNames.indexOf(featureName);
        const featureGroup = this.vectorView.visibleFeatureGroups[featureIndex];

        this.vectorView.visibleFeatureIndices.splice(featureIndex, 1);
        this.vectorView.visibleFeatureGroups.splice(featureIndex, 1);
        this.vectorView.visibleFeatureNames.splice(featureIndex, 1);

        const layer = this.featureNameToLayer.get(featureName);

        layer.getSource().changed();

        map.removeLayer(layer);
        this.featureNameToLayer.delete(featureName);

        this.updateInteractedFeature(featureName);
    }

    setVisibility(value) {
        for (const featureName of this.vectorView.visibleFeatureNames) {
            this.featureNameToLayer.get(featureName).setVisible(value);
        }

        this.isVisible = value;
    }

    setFeatureFillColor(featureName, hex) {
        this.featureToColor.set(featureName, hex);
        let fview = this.vectorView.featureNameToView.get(featureName);
        fview.fillColor = hex;
        fview.shape = generateShape(fview.shapeType, this.vectorView.strokeWidth, hexToRgba(this.vectorView.strokeColor, this.vectorView.strokeOpacity), hexToRgba(fview.fillColor, this.vectorView.fillOpacity), this.vectorView.scale);

        const layer = this.featureNameToLayer.get(featureName);
        layer.setStyle(layer.getStyle());

        this.updateInteractedFeature(featureName);
    }

    setFeatureShapeType(featureName, shapeName) {
        let fview = this.vectorView.featureNameToView.get(featureName);
        fview.shapeType = shapeName;
        fview.shape = generateShape(fview.shapeType, this.vectorView.strokeWidth, hexToRgba(this.vectorView.strokeColor, this.vectorView.strokeOpacity), hexToRgba(fview.fillColor, this.vectorView.fillOpacity), this.vectorView.scale);

        const layer = this.featureNameToLayer.get(featureName);
        layer.setStyle(layer.getStyle());

        this.updateInteractedFeature(featureName);
    }

    setVectorViewValue(key, value) {
        this.vectorView[key] = value;
        for (const [featureName, fview] of this.vectorView.featureNameToView) {
            let fview = this.vectorView.featureNameToView.get(featureName);
            fview.shape = generateShape(fview.shapeType, this.vectorView.strokeWidth, hexToRgba(this.vectorView.strokeColor, this.vectorView.strokeOpacity), hexToRgba(fview.fillColor, this.vectorView.fillOpacity), this.vectorView.scale);
        }

        this.restyleLayers();
    }

    setScale(scale) {
        this.setVectorViewValue('scale', scale);
    }

    setFillOpacity(fillOpacity) {
        this.setVectorViewValue('fillOpacity', fillOpacity);
    }

    setStrokeWidth(strokeWidth) {
        this.setVectorViewValue('strokeWidth', strokeWidth);
    }

    setStrokeColor(hex) {
        this.setVectorViewValue('strokeColor', hex);
    }

    setStrokeOpacity(strokeOpacity) {
        this.setVectorViewValue('strokeOpacity', strokeOpacity);
    }

    async populateInitialFields(map) {
        const metaPath = '/metadata/features'
        const featureNamesArr = await open(this.node.resolve(`${metaPath}/feature_names`), { kind: "array" });
        const featureNamesChunk = await get(featureNamesArr, [null]);
        this.featureNames = featureNamesChunk.data;

        this.resToFeatureInfo = new globalThis.Map();

        const countNode = this.featureMetaToNode.get('Count');
        let arr = await open(countNode.resolve('/metadata/vmins_by_res'), { kind: "array" });
        let chunk = await get(arr, [null, null]);
        const rowToVmins = extractRows(chunk);
        arr = await open(countNode.resolve('/metadata/vmaxs_by_res'), { kind: "array" });
        chunk = await get(arr, [null, null]);
        const rowToVmaxs = extractRows(chunk);
        
        for (let i = 0; i < rowToVmins.size; i++) {
            // const res = this.node.attrs.resolutions[i];
            const res = [...this.resolutions].reverse()[i];
            const info = {
                'vmins': rowToVmins.get(i),
                'vmaxs': rowToVmaxs.get(i)
            }
            this.resToFeatureInfo.set(res, info);
        }

        this.featureGroupsMap = new globalThis.Map();
        

        for (let i = 0; i < this.resolutions.length; i++) {
            const res = this.resolutions[i];
            const featureGroupsArr = await open(this.node.resolve(`${metaPath}/feature_groups/${res}`), { kind: "array" });
            const featureGroupsChunk = await get(featureGroupsArr, [null]);
            this.featureGroupsMap.set(res, featureGroupsChunk.data);
        }

        this.featureGroups = [];
        for (let i = 0; i < this.featureNames.length; i++) {
            let fgs = [];
            for (let j = 0; j < this.resolutions.length; j++) {
                const res = this.resolutions[j];
                fgs.push(this.featureGroupsMap.get(res)[i]);
            }
            this.featureGroups.push(fgs.join());
        }

        this.featureNameToLayer = new SvelteMap();

        console.log('view settings', this.viewSettings);

        const feature_styles = this.viewSettings?.feature_styles ?? {};
        console.log('feature styles', feature_styles);
        // opacity: this.viewSettings.opacity ?? 1.0,

        this.featureToColor = generateColorMapping(defaultPalettes.featurePallete, this.featureNames);
        //create view
        this.vectorView = {
            featureNameToView: new globalThis.Map(),
            scale: this.viewSettings?.scale ?? 1.0,
            fillOpacity: this.viewSettings?.fillOpacity ?? 1.0,
            strokeOpacity: this.viewSettings?.strokeOpacity ?? 1.0,
            strokeWidth: this.viewSettings?.strokeWidth ?? 1.0,
            strokeColor: this.viewSettings?.strokeColor ?? '#dddddd',
            visibleFeatureNames: [],
            visibleFeatureGroups: [],
            visibleFeatureIndices: [],
            zarrVectorLoaders: [],
            interactedFeatureNames: []
        };

        for (let i = 0; i < this.featureNames.length; i++) {
            const featureName = this.featureNames[i];

            if (!(featureName in feature_styles)) {
                const catFeatureView = {
                    shapeType: 'circle',
                    fillColor: this.featureToColor.get(featureName)
                };
                catFeatureView.shape = generateShape(catFeatureView.shapeType, this.vectorView.strokeWidth, this.vectorView.strokeColor, catFeatureView.fillColor, this.vectorView.scale);

                this.vectorView.featureNameToView.set(featureName, catFeatureView);
            } else {
                const s = feature_styles[featureName];
                this.featureToColor.set(featureName, s.fill_color);
                const catFeatureView = {
                    shapeType: s.shape_type,
                    fillColor: this.featureToColor.get(featureName),
                    shape: generateShape(s.shape_type, this.vectorView.strokeWidth, this.vectorView.strokeColor, s.fill_color, this.vectorView.scale)
                };
                this.vectorView.featureNameToView.set(featureName, catFeatureView);
            }
            
        }

        for (const fname of this.viewSettings?.visible_feature_names ?? []) {
            this.addFeature(fname, map);
            // const idx = this.featureNames.indexOf(fname);
            // this.vectorView.visibleFeatureNames.push(fname);
            // this.vectorView.visibleFeatureGroups.push(this.featureGroups[idx]);
            // this.vectorView.visibleFeatureIndices.push(idx);
        }

        console.log('vectorView', this.vectorView);

        this.isLoaded = true;

    }
}


export class FeatureVector {
    constructor(
        node,
        vectorId,
        baseImage,
        insertionIdx,
        viewSettings,
    ) {
        this.node = node;
        this.isVisible = viewSettings.is_visible;
        this.viewSettings = viewSettings;

        this.version = node.attrs.version;
        this.name = node.attrs.name;
        this.vectorId = vectorId;
        this.resolutions = this.node.attrs.resolutions.sort((a, b) => b - a);
        this.objectTypes = this.node.attrs.object_types;
        this.sizeX = baseImage.sizeX;
        this.sizeY = baseImage.sizeY;
        this.tileSize = baseImage.tileSize;
        this.upp = baseImage.upp;
        this.unit = baseImage.unit;
        this.metadataToView = new Map();
        this.metadataName = null;
        this.metadataNode = null;
        this.metadataIsSparse = null;
        this.metadataFields = null;
        this.metadataFieldIdxs = null;
        this.metadataToType = null;
        this.metadataType = null;
        this.filterMap = new Map();
        this.maskingMap = new Map();
        this.layer = null;
        this.visibleFeatures = [];
        this.activeGeometryCollection = null;
        this.currentZoom = this.resolutions[0] / this.tileSize;
        this.currentRes = this.resolutions[0];
        this.closestRes = this.currentRes;

        this.insertionIdx = insertionIdx;

        this.currentFeature = undefined;

        this.metadataIsLoaded = false;

        this.projection = baseImage.projection
    }

    async init(map) {
        await this.setMetadata(null, null, map);
        return this;
    }

    static async create(node, vectorId, baseImage, insertionIdx, viewSettings, map) {
        const instance = new FeatureVector(node, vectorId, baseImage, insertionIdx, viewSettings, map);
        return await instance.init(map);
    }

    createLayer(useMetadata = true) {
        if (this.metadataName == null) {
            useMetadata = false;
        }

        let metadataToNode = new Map();
        let metadataToFieldIdxs = new Map();
        let metadataToIsSparse = new Map();
        let metadataToType = new Map();

        if (useMetadata) {
            metadataToNode.set(this.metadataName, this.metadataNode);
            metadataToFieldIdxs.set(this.metadataName, this.metadataFieldIdxs);
            metadataToIsSparse.set(this.metadataName, this.metadataIsSparse);
            metadataToType.set(this.metadataName, this.metadataType);
        }

        for (const [metadataName, filter] of this.filterMap) {
            metadataToNode.set(filter.metadataName, filter.metadataNode);
            metadataToFieldIdxs.set(filter.metadataName, filter.metadataFieldIdxs);
            metadataToIsSparse.set(filter.metadataName, filter.metadataIsSparse);
            metadataToType.set(filter.metadataName, filter.metadataType);
        }

        // vectorNode, fullImageHeight, fullImageWidth, pixelProjection, tileSize, resolutions, metadataToNode, metadataToType, metadataToFieldIdxs, metadataToIsSparse
        const vectorLoader = new ZarrVectorLoader(
            this.node,
            this.sizeY,
            this.sizeX,
            this.projection,
            this.tileSize,
            this.resolutions,
            metadataToNode,
            metadataToType,
            metadataToFieldIdxs,
            metadataToIsSparse,
        );

        const vectorTileSource = vectorLoader.vectorTileSource;

        const vectorTileStyle = (feature) => {
            const props = feature.values_;
            const v = this.vectorView;

            if (props == null) {
                return null;
            }

            if (!this.featureIsVisible(feature, props)) {
                return null;
            }

            if (this.metadataType == 'categorical') {
                const fieldIdx = props[this.metadataName].category;
                const field = this.metadataFields[fieldIdx];
                const view = v.fieldToView.get(field);
                if (this.vectorView.visibleFieldIndices.includes(fieldIdx)) {
                    if (props.isPoint) {
                        this.visibleFeatures.push(feature);
                        return new Style({
                            image: view.shape
                        });
                    } else {
                        this.visibleFeatures.push(feature);
                        const style = new Style({
                            fill: new Fill({ color: hexToRgba(view.fillColor, v.fillOpacity) }),
                            stroke: new Stroke({ color: hexToRgba(view.strokeColor, v.strokeOpacity), width: v.strokeWidth })
                        });
                        return style
                    }
                }
            } else {
                if (v.visibleFieldIndices.length == 0) {
                    if (props.isPoint) {
                        this.visibleFeatures.push(feature);
                        const shape = generateShape(v.featureView.shapeType, v.strokeWidth, hexToRgba(v.strokeColor, v.strokeOpacity), hexToRgba('#aaaaaa', v.fillOpacity), v.scale);
                        return new Style({
                            image: shape
                        });
                    } else {
                        this.visibleFeatures.push(feature);
                        return new Style({
                            fill: new Fill({ color: hexToRgba('#aaaaaa', v.fillOpacity) }),
                            stroke: new Stroke({ color: hexToRgba(v.strokeColor, v.strokeOpacity), width: v.strokeWidth })
                        });
                    }
                } else {
                    const visibleIdx = v.visibleFieldIndices[0];
                    const obj = props[this.metadataName];
                    const vInfo = this.metadataFieldToVInfo.get(visibleIdx);
                    let value;
                    if (this.metadataIsSparse) {
                        if (!(obj instanceof Map)) {
                            return null;
                        } else if (obj.has(visibleIdx)) {
                            value = obj.get(visibleIdx);
                        } else {
                            value = vInfo.vMin;
                        }

                    } else {
                        if (obj && visibleIdx in obj) {
                            value = obj[visibleIdx];
                        } else {
                            console.log('metadata is not sparse and visible idx not found', props);
                        }
                    }

                    const fillColor = valueToColor(
                        v.palette, value, vInfo.vMin, vInfo.vMax, vInfo.vCenter
                    );
                    let strokeColor = v.strokeColor;
                    if (v.borderType == 'field') {
                        strokeColor = adjustHexLightness(fillColor, v.strokeDarkness);
                    }

                    if (props.isPoint) {
                        this.visibleFeatures.push(feature);
                        const shape = generateShape(v.featureView.shapeType, v.strokeWidth, hexToRgba(strokeColor, v.strokeOpacity), hexToRgba(fillColor, v.fillOpacity), v.scale);
                        return new Style({
                            image: shape
                        });
                    } else {
                        this.visibleFeatures.push(feature);
                        return new Style({
                            fill: new Fill({ color: hexToRgba(fillColor, v.fillOpacity) }),
                            stroke: new Stroke({ color: hexToRgba(strokeColor, v.strokeOpacity), width: v.strokeWidth })
                        });
                    }
                }
            }
        }

        const layer = new VectorTileLayer({
            preload: 0,
            source: vectorTileSource,
            style: vectorTileStyle,
        });
        layer.setVisible(this.isVisible);

        // layer.on('prerender', (event) => {
        // });
        // layer.on('postrender', (event) => {
        //     if (this.needsRegen && this.visibleFeatures.length > 0) {
        //         this.activeGeometryCollection = new GeometryCollection(this.visibleFeatures.map(f => f.getGeometry()));
        //         this.needsRegen = false;
        //     }
        // });

        return { layer, vectorLoader };
    }

    updateResolutionInfo(map) {
        const current = map.getView().getResolution();
        this.currentRes = current * this.tileSize;
        this.closestRes = getClosestResolution(map, this.resolutions, this.tileSize);
        this.currentZoom = current;        
    }

    initializeContinuousView() {
        console.log('view settings used are', this.viewSettings);
        if (!this.vectorView) {
            this.vectorView = {
                featureView: null,
                fillOpacity: this.viewSettings?.fill_opacity ?? 1.0,
                strokeOpacity: this.viewSettings?.stroke_opacity ?? 1.0,
                strokeWidth: this.viewSettings?.storke_width ?? 1.,
                strokeColor: this.viewSettings?.stroke_color ?? '#dddddd',
                strokeDarkness: this.viewSettings?.stroke_darkness ?? .5,
                borderType: this.viewSettings?.border_type ??  'default',
                scale: this.viewSettings?.scale ?? 1.0,
                palette: this.viewSettings?.palette ?? defaultPalettes.continousPalette,
                visibleFields: [],
                visibleFieldIndices: [],
                interactedFieldNames: [],
                interactedFieldIndices: [],
                fieldToVInfo: this.metadataFieldToVInfo,
            }
        } else {
            this.vectorView = {
                featureView: null,
                fillOpacity: this.viewSettings?.fill_opacity ?? this.vectorView.fillOpacity,
                strokeOpacity: this.viewSettings?.stroke_opacity ?? this.vectorView.strokeOpacity,
                strokeWidth: this.viewSettings?.storke_width ?? this.vectorView.strokeWidth,
                strokeColor: this.viewSettings?.stroke_color ?? this.vectorView.strokeColor,
                strokeDarkness: this.viewSettings?.stroke_darkness ?? this.vectorView.strokeDarkness,
                borderType: this.viewSettings?.border_type ??  this.vectorView.borderType,
                scale: this.viewSettings?.scale ?? this.vectorView.scale,
                palette: this.viewSettings?.palette ?? defaultPalettes.continousPalette,
                visibleFields: [],
                visibleFieldIndices: [],
                interactedFieldNames: [],
                interactedFieldIndices: [],
                fieldToVInfo: this.metadataFieldToVInfo,
            }
        }
        for (const [field, vinfo] of Object.entries(this.viewSettings?.field_value_info ?? {})) {
            const fIndex = this.metadataFields.indexOf(field);
            const obj = this.vectorView.fieldToVInfo.get(fIndex);
            this.vectorView.fieldToVInfo.set(fIndex, {...obj, ...vinfo});
            this.metadataFieldToVInfo.set(fIndex, {...obj, ...vinfo});
        }

        const visibleField = this.viewSettings.visible_field
        if (visibleField) {
            this.vectorView.visibleFields = [visibleField];
            this.vectorView.visibleFieldIndices = this.metadataFields ? this.vectorView.visibleFields.map((v) => this.metadataFields.indexOf(v)) : [];
        } else {
            this.vectorView.visibleFields = [];
            this.vectorView.visibleFieldIndices = [];
        }

        const contFeatureView = {
            shapeType: this.viewSettings?.feature_style?.shape_type ?? 'circle',
        };
        contFeatureView.shape = generateShape(contFeatureView.shapeType, this.vectorView.strokeWidth, hexToRgba(this.vectorView.strokeColor, this.vectorView.strokeOpacity), hexToRgba('#aaaaaa', this.vectorView.fillOpacity), this.vectorView.scale);
        this.vectorView.featureView = contFeatureView;

        if (this.vectorView.borderType == 'field') {
            this.setBorderColoring(this.vectorView.strokeDarkness);
        }
    }

    initializeCategoricalView() {
        this.fieldToColor = generateColorMapping(defaultPalettes.featurePallete, this.metadataFields);

        if (!this.vectorView) {
            this.vectorView = {
                fieldToView: new globalThis.Map(),
                fillOpacity: 1.0,
                strokeOpacity: 1.0,
                strokeWidth: 1.,
                strokeColor: '#dddddd',
                strokeDarkness: .5,
                borderType: 'default',
                scale: 1.0,
                visibleFields: [],
                visibleFieldIndices: [],
                interactedFieldNames: [],
            };
        } else {
            this.vectorView = {
                ...this.vectorView,
                fieldToView: new globalThis.Map(),
                fillOpacity: this.viewSettings?.fill_opacity ?? this.vectorView.fillOpacity,
                strokeOpacity: this.viewSettings?.stroke_opacity ?? this.vectorView.strokeOpacity,
                strokeWidth: this.viewSettings?.storke_width ?? this.vectorView.strokeWidth,
                strokeColor: this.viewSettings?.stroke_color ?? this.vectorView.strokeColor,
                strokeDarkness: this.viewSettings?.stroke_darkness ?? this.vectorView.strokeDarkness,
                borderType: this.viewSettings?.border_type ??  this.vectorView.borderType,
                scale: this.viewSettings?.scale ?? this.vectorView.scale,
                visibleFields: [],
                visibleFieldIndices: [],
                interactedFieldNames: [],
            }
        }

        for (let i = 0; i < this.metadataFields.length; i++) {
            const field = this.metadataFields[i];

            const fStyles = this.viewSettings?.field_styles ?? {};
            if (field in fStyles) {
                const catFeatureView = {
                    shapeType: fStyles[field].shape_type,
                    strokeColor: this.vectorView.strokeColor,
                    fillColor: fStyles[field].fill_color
                };
                this.fieldToColor.set(field, fStyles[field].fill_color);
            } else {
                const catFeatureView = {
                    shapeType: 'circle',
                    strokeColor: this.vectorView.strokeColor,
                    fillColor: this.fieldToColor.get(field)
                };
            }
            
            catFeatureView.shape = generateShape(catFeatureView.shapeType, this.vectorView.strokeWidth, hexToRgba(catFeatureView.strokeColor, this.vectorView.strokeOpacity), hexToRgba(catFeatureView.fillColor, this.vectorView.fillOpacity), this.vectorView.scale);

            this.vectorView.fieldToView.set(field, catFeatureView);
        }

        if (this.viewSettings?.visible_fields) {
            this.vectorView.visibleFields = this.viewSettings?.visible_fields ?? [];
            this.vectorView.visibleFieldIndices = this.vectorView.visibleFields.map((field) => this.metadataFields.indexOf(field));
            
        } else {
            this.vectorView.visibleFieldIndices = [...this.metadataFieldIdxs];
            this.vectorView.visibleFields = [...this.metadataFields];
        }

        if (this.vectorView.borderType == 'field') {
            this.setBorderColoring(this.vectorView.strokeDarkness);
        }
    }

    replaceLayer(layer, map) {
        let idx;
        if (this.layer) {
            idx = map.getLayers().getArray().indexOf(this.layer);
            map.removeLayer(this.layer);
        } else {
            idx = this.insertionIdx;
        }

        this.layer = layer;

        map.getLayers().insertAt(idx, layer);
        
        this.restyleLayers();
    }

    restyleLayers() {
        this.visibleFeatures = [];
        this.layer.setStyle(this.layer.getStyle());
    }


    async setMetadata(metadataName, metadataNode, map, viewSettings = null) {
        if (viewSettings != null) {
            this.viewSettings = viewSettings;
        }

        if (this.metadataName) {
            this.metadataToView.set(this.metadataName, this.vectorView); // saving previous
        }

        let obj;
        if (metadataName) {
            const path = '/metadata/fields'
            const fieldsArr = await open(metadataNode.resolve(path), { kind: "array" });
            const chunk = await get(fieldsArr, [null]);
            this.metadataFields = chunk.data;

            this.metadataName = metadataName;
            this.metadataNode = metadataNode;
            this.metadataIsSparse = metadataNode.attrs.is_sparse;
            this.metadataFieldIdxs = [];
            for (let i = 0; i < this.metadataFields.length; i++) {
                this.metadataFieldIdxs.push(i);
            }

            this.metadataType = metadataNode.attrs.type;

            if (this.metadataType == 'categorical') {
                if (this.metadataToView.has(this.metadataName)) {
                    this.vectorView = this.metadataToView.get(this.metadataName);
                } else {
                    this.initializeCategoricalView();
                }

            } else {
                let chunk;
                chunk = await get(await open(metadataNode.resolve('/metadata/vmins'), { kind: "array" }), [null]);
                const vmins = chunk.data;
                chunk = await get(await open(metadataNode.resolve('/metadata/vmaxs'), { kind: "array" }), [null]);
                const vmaxs = chunk.data;
                chunk = await get(await open(metadataNode.resolve('/metadata/vcenters'), { kind: "array" }), [null]);
                const vcenters = chunk.data;

                const fieldValueInfo = this.viewSettings?.field_value_info ?? {};
                this.metadataFieldToVInfo = new Map();
                for (let i = 0; i < vmins.length; i++) {
                    let vMin;
                    let vMax;
                    let vCenter;
                    let vStepSize;
                    if (this.metadataFields[i] in fieldValueInfo) {
                        const info = fieldValueInfo[this.metadataFields[i]];
                        vMin = info.v_min;
                        vMax = info.v_max;
                        vCenter = info.v_center;
                        vStepSize = info.v_step_size;
                    } else {
                        vMin = vmins[i];
                        vMax = vmaxs[i];
                        vStepSize = .01;
                        if (vcenters[i] == -99999) {
                            vCenter = null;
                        } else {
                            vCenter = vcenters[i];
                        }
                    }

                    this.metadataFieldToVInfo.set(
                        this.metadataFieldIdxs[i],
                        {
                            vMin: vMin,
                            vMax: vMax,
                            absoluteVMin: vmins[i],
                            absoluteVMax: vmaxs[i],
                            vCenter: vCenter,
                            vStepSize: vStepSize,
                        }
                    );
                }

                if (this.metadataToView.has(this.metadataName)) {
                    this.vectorView = this.metadataToView.get(this.metadataName);
                } else {
                    this.initializeContinuousView();
                }
            }

            obj = this.createLayer();
            this.vectorView.zarrVectorLoader = obj.vectorLoader;
        } else {
            this.initializeContinuousView();
            obj = this.createLayer(false);
            this.vectorView.zarrVectorLoader = obj.vectorLoader;
        }
        this.replaceLayer(obj.layer, map);

    }

    async addMetadataFilter(metadataName, metadataNode, map) {
        if (!this.filterMap.has(metadataName)) {
            const path = '/metadata/fields'
            const fieldsArr = await open(metadataNode.resolve(path), { kind: "array" });
            let chunk = await get(fieldsArr, [null]);
            let metadataFields = chunk.data;

            let metadataFieldIdxs = [];
            for (let i = 0; i < metadataFields.length; i++) {
                metadataFieldIdxs.push(i);
            }

            let vmins = null;
            let vmaxs = null;
            if (metadataNode.attrs.type == 'continuous') {
                chunk = await get(await open(metadataNode.resolve('/metadata/vmins'), { kind: "array" }), [null]);
                vmins = chunk.data;
                chunk = await get(await open(metadataNode.resolve('/metadata/vmaxs'), { kind: "array" }), [null]);
                vmaxs = chunk.data;
            }

            this.filterMap.set(metadataName, {
                metadataName: metadataName,
                metadataNode: metadataNode,
                metadataIsSparse: metadataNode.attrs.is_sparse,
                metadataFields: metadataFields,
                metadataFieldIdxs: metadataFieldIdxs,
                metadataType: metadataNode.attrs.type,
                vmins: vmins,
                vmaxs: vmaxs,
                operations: new Map(),
            });

            let obj = this.createLayer();
            this.vectorView.zarrVectorLoader = obj.vectorLoader;
            this.replaceLayer(obj.layer, map);
        }

    }

    async removeMetadataFilter(metadataName, map) {
        this.filterMap.delete(metadataName);
        let obj = this.createLayer();
        this.vectorView.zarrVectorLoader = obj.vectorLoader;
        this.replaceLayer(obj.layer, map);
    }

    addMetadataFilterOperation(metadataName, field, key, symbol, value) {
        this.filterMap.get(metadataName).operations.set(key, {
            symbol: symbol,
            value: value,
            field: field,
            fieldIdx: this.filterMap.get(metadataName).metadataFields.indexOf(field)
        });
        this.restyleLayers();
    }

    removeMetadataFilterOperation(metadataName, key) {
        this.filterMap.get(metadataName).operations.delete(key);

        this.restyleLayers();
    }

    addLayerFilter(layerName, layer, symbol, key, map) {
        if (layer.getCurrentObjectType(map) == 'polygon') {
            this.maskingMap.set(key, { symbol: symbol, name: layerName, layer: layer });
            this.updateLayerFilterGeoms();
            this.restyleLayers();
        }
    }

    removeLayerFilter(layerName, key) {
        this.maskingMap.delete(key);
        this.restyleLayers();
    }

    updateLayerFilterGeoms() {
        for (const [key, filter] of this.maskingMap) {
            filter.layer.activeGeometryCollection = new GeometryCollection(filter.layer.visibleFeatures.map(f => f.getGeometry()));
        }
    }

    featureIsVisible(feature, props) {
        let passesMetadata = true;
        let passesLayer = true;

        for (const [layerName, filter] of this.maskingMap) {
            let coord;
            if (props.isPoint) {
                coord = feature.getGeometry().getCoordinates();
            } else {
                coord = feature.getGeometry().getInteriorPoint().getCoordinates();
            }
            // const activeGeometryCollection = new GeometryCollection(filter.layer.visibleFeatures.map(f => f.getGeometry()));

            const doesIntersect = filter.layer.activeGeometryCollection.intersectsCoordinate(coord);
            let passesOperation = false;
            if (doesIntersect && filter.symbol == 'is in') {
                passesOperation = true
            } else if (!doesIntersect && filter.symbol == 'is not in') {
                passesOperation = true
            }
            passesLayer = passesLayer && passesOperation;

        }

        for (const [metadataName, filter] of this.filterMap) {
            if (filter.metadataType == 'categorical') {
                const fieldIdx = props[filter.metadataName].category;
                const field = filter.metadataFields[fieldIdx];
                for (const [k, op] of filter.operations) {
                    if (op.symbol == '=') {
                        passesMetadata = passesMetadata && op.field == field
                    } else {
                        passesMetadata = passesMetadata && op.field != field
                    }
                }

            } else {
                const obj = props[filter.metadataName];
                for (const [k, op] of filter.operations) {
                    let passesOperation = false;
                    let value;
                    if (filter.metadataIsSparse) {
                        if (!(obj instanceof Map)) {
                            return null;
                        } else if (obj.has(op.fieldIdx)) {
                            value = obj.get(op.fieldIdx);
                        } else {
                            value = 0;
                        }
                    } else {
                        value = obj[op.fieldIdx];
                    }

                    if (op.symbol == '=') {
                        passesOperation = value == op.value;
                    } else if (op.symbol == '<=') {
                        passesOperation = value <= op.value;
                    } else if (op.symbol == '<') {
                        passesOperation = value < op.value;
                    } else if (op.symbol == '>=') {
                        passesOperation = value >= op.value;
                    } else if (op.symbol == '>') {
                        passesOperation = value > op.value;
                    }

                    passesMetadata = passesMetadata && passesOperation;
                }
            }
        }

        return passesMetadata && passesLayer;


    }

    getCurrentObjectType(map) {
        const res = getClosestResolution(map, this.resolutions, this.tileSize);
        const idx = this.resolutions.indexOf(res);
        const objType = this.objectTypes[idx];
        return objType;
    }

    addFeature(featureName) {
        // @ts-ignore
        const fieldIndex = this.metadataFields.indexOf(featureName);

        if (this.metadataType == 'categorical') {
            this.vectorView.visibleFieldIndices.push(fieldIndex);
            this.vectorView.visibleFields.push(featureName);
        } else { // continuous can only be one at a time
            this.vectorView.visibleFieldIndices = [fieldIndex];
            this.vectorView.visibleFields = [featureName];
        }
        this.restyleLayers();
    }

    removeFeature(featureName) {
        const fieldIndex = this.vectorView?.visibleFields.indexOf(featureName);

        this.vectorView.visibleFieldIndices.splice(fieldIndex, 1);
        this.vectorView.visibleFields.splice(fieldIndex, 1);

        this.restyleLayers();
    }

    setVisibility(value) {
        this.layer.setVisible(value);

        this.isVisible = value;
    }

    setFeatureFillColor(featureName, hex) {
        this.vectorView.fieldToView.get(featureName).fillColor = hex;

        if (this.metadataType == 'categorical' && this.vectorView.borderType == 'field') {
            this.setBorderColoring(this.vectorView?.strokeDarkness);
        }

        this.restyleLayers();
    }

    setFeatureShapeType(featureName, shapeName) {
        if (this.objectTypes.includes('point')) {
            if (this.metadataType == 'categorical') {
                this.vectorView.featureNameToView.get(featureName).shapeType = shapeName;
            } else {
                this.vectorView.featureView.shapeType = shapeName;
            }

            this.restyleLayers();
        }

    }

    setScale(scale) {
        this.vectorView.scale = scale;

        this.restyleLayers();
    }

    setFillOpacity(fillOpacity) {
        this.vectorView.fillOpacity = fillOpacity;

        this.restyleLayers();
    }

    setStrokeWidth(strokeWidth) {
        const v = Math.max(.01, strokeWidth);
        this.vectorView.strokeWidth = v; //cant be zero

        this.restyleLayers();
    }

    setFieldStrokeColor(featureName, hex) {
        this.vectorView.fieldToView.get(featureName).strokeColor = hex;
        this.restyleLayers();
    }

    setStrokeColor(hex) {
        this.vectorView.strokeColor = hex;
        if (this.metadataType == 'categorical') {
            for (const [fname, v] of this.vectorView.fieldToView) {
                v.strokeColor = hex;
            }
        }

        this.restyleLayers();
    }

    setStrokeOpacity(strokeOpacity) {
        this.vectorView.strokeOpacity = strokeOpacity;

        this.restyleLayers();
    }

    setPalette(palette) {
        this.vectorView.palette = palette;

        this.restyleLayers();
    }

    setVMin(fieldName, value) {
        const idx = this.metadataFields.indexOf(fieldName);
        this.metadataFieldToVInfo.get(idx).vMin = value;

        this.restyleLayers();
        this.updateInteractedField(fieldName);
    }

    setVMax(fieldName, value) {
        const idx = this.metadataFields.indexOf(fieldName);
        this.metadataFieldToVInfo.get(idx).vMax = value;

        this.restyleLayers();
        this.updateInteractedField(fieldName);
    }

    setVCenter(fieldName, value) {
        const idx = this.metadataFields.indexOf(fieldName);
        this.metadataFieldToVInfo.get(idx).vCenter = value;

        this.restyleLayers();
        this.updateInteractedField(fieldName);
    }

    setBorderType(value) {
        this.vectorView.borderType = value;

        if (value == 'default') {
            this.setStrokeColor(this.vectorView.strokeColor);
        } else if (value == 'field') {
            this.setBorderColoring(this.vectorView.strokeDarkness);
        }
    }

    setBorderColoring(value) {
        this.vectorView.strokeDarkness = value
        if (this.metadataType == 'categorical') {
            for (const [fname, v] of this.vectorView.fieldToView) {
                v.strokeColor = adjustHexLightness(v.fillColor, value);
            }
        }

        this.restyleLayers();
    }

    updateInteractedField(field) {
        if (!this.vectorView?.interactedFieldNames.includes(field)) {
            this.vectorView?.interactedFieldNames.push(field);
            this.vectorView?.interactedFieldIndices.push(this.metadataFields.indexOf(field));
        }
    }



}
