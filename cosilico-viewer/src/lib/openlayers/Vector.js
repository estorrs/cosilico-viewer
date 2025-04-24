// @ts-nocheck

import { open } from "@zarrita/core";
import { get, slice } from "@zarrita/indexing";
import { Projection } from 'ol/proj';
import VectorTileLayer from 'ol/layer/VectorTile';
import { SvelteMap } from "svelte/reactivity";
import { Style, Fill, Stroke } from "ol/style";


import { GroupedZarrVectorLoader, ZarrVectorLoader } from './ZarrVectorLoader';
import { generateColorMapping, defaultPalettes, valueToColor } from './ColorHelpers';
import { generateShape } from "./ShapeHelpers";
import { initZarr } from "./ZarrHelpers";

export class FeatureGroupVector {
    constructor(
        node,
        vectorId,
        featureMetaToNode,
        baseImage,
    ) {
        this.node = node;
        this.isVisible = false;

        this.version = node.attrs.version;
        this.name = node.attrs.name;
        this.vectorId = vectorId;
        this.resolutions = this.node.attrs.resolutions.sort((a, b) => b - a);
        this.sizeY = baseImage.sizeY;
        this.sizeX = baseImage.sizeX;
        this.tileSize = baseImage.tileSize;
        this.featureMetaToNode = featureMetaToNode;

        this.currentFeature = undefined;

        this.isLoaded = false;

        this.projection = baseImage.projection

    }

    async init() {
        await this.populateInitialFields();
        return this;
    }

    static async create(node, vectorId, featureMetaToNode, baseImage) {
        const instance = new FeatureGroupVector(node, vectorId, featureMetaToNode, baseImage);
        return await instance.init();
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
            if (this.vectorView.visibleFeatureIndices.includes(idx)) {
                return new Style({
                    image: this.vectorView.featureNameToView.get(name).shape
                });
            }
        }

        const layer = new VectorTileLayer({
            preload: 0,
            source: vectorTileSource,
            style: vectorTileStyle,
        });

        return layer;
    }

    setFeatureMetadata(featureMetaToNode, map) {
        this.featureMetaToNode = featureMetaToNode

        for (let i = 0; i < this.vectorView.visibleFeatureNames.length; i++) {
            const featureName = this.vectorView.visibleFeatureNames[i];
            const featureGroup = this.vectorView.visibleFeatureGroups[i];
            const oldLayer = this.featureNameToLayer.get(featureName);

            // remove old layer
            map.removeLayer(oldLayer);
            this.featureNameToLayer.delete(featureName);

            // add new layer
            const layer = this.createLayer(featureGroup);
            map.addLayer(layer);
            this.featureNameToLayer.set(featureName, layer);
        }
    }

    setFeatureToolTip(map, info) {
        const displayFeatureInfo = (pixel, target) => {
            const res = map.getView().getResolution();
            // console.log('current map resolution', res);
            // console.log('current map z', this.vectorView.featureNameToViewtileGrid.getZForResolution(map.getView().getResolution()));
            const feature = target.closest('.ol-control')
                ? undefined
                : map.forEachFeatureAtPixel(pixel, function (feature) {
                    return feature;
                });
            if (feature) {
                info.style.left = pixel[0] + 'px';
                info.style.top = pixel[1] + 'px';
                if (feature !== this.currentFeature) {
                    info.style.visibility = 'visible';

                    if (res < this.resolutions[this.resolutions.length - 1] / this.tileSize) {
                        const identifier = feature.get('id')
                        let text = `id: ${identifier}\n`;
                        for (const [key, _] of this.featureMetaToNode) {
                            if (key !== 'count') {
                                const value = feature.get(key);
                                text = text + `${key}: ${value}\n`;
                            }
                        }

                        info.innerText = text;
                    } else {
                        const count = feature.get('count')
                        info.innerText = `# entities: ${count}`;
                    }
                }
            } else {
                info.style.visibility = 'hidden';
            }
            this.currentFeature = feature;
        };

        map.on('pointermove', function (evt) {
            if (evt.dragging) {
                info.style.visibility = 'hidden';
                this.currentFeature = undefined;
                return;
            }
            displayFeatureInfo(evt.pixel, evt.originalEvent.target);
        });

        map.on('click', function (evt) {
            displayFeatureInfo(evt.pixel, evt.originalEvent.target);
        });

        map.getTargetElement().addEventListener('pointerleave', function () {
            this.currentFeature = undefined;
            info.style.visibility = 'hidden';
        });
    }

    addFeature(featureName, map) {
        // @ts-ignore
        const featureIndex = this.featureNames.indexOf(featureName);
        const featureGroup = this.featureGroups[featureIndex];

        const layer = this.createLayer(featureGroup);

        map.addLayer(layer);

        this.featureNameToLayer.set(featureName, layer);

        this.vectorView.visibleFeatureIndices.push(featureIndex);
        this.vectorView.visibleFeatureGroups.push(featureGroup);
        this.vectorView.visibleFeatureNames.push(featureName);
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
    }



    async populateInitialFields() {
        const metaPath = '/metadata/features'
        const featureNamesArr = await open(this.node.resolve(`${metaPath}/feature_names`), { kind: "array" });
        const featureNamesChunk = await get(featureNamesArr, [null]);
        this.featureNames = featureNamesChunk.data;

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

        this.featureToColor = generateColorMapping(defaultPalettes.featurePallete, this.featureNames);
        //create view
        this.vectorView = {
            featureNameToView: new globalThis.Map(),
            scale: 1.0,
            fillOpacity: 1.0,
            strokeOpacity: 1.0,
            visibleFeatureNames: [],
            visibleFeatureGroups: [],
            visibleFeatureIndices: [],
            zarrVectorLoaders: [],
        };

        for (let i = 0; i < this.featureNames.length; i++) {
            const featureName = this.featureNames[i];
            const catFeatureView = {
                shapeType: 'circle',
                strokeWidth: 1.,
                strokeColor: '#dddddd',
                fillColor: this.featureToColor.get(featureName)
            };
            catFeatureView.shape = generateShape(catFeatureView.shapeType, catFeatureView.strokeWidth, catFeatureView.strokeColor, catFeatureView.fillColor);

            this.vectorView.featureNameToView.set(featureName, catFeatureView);
        }
        this.isLoaded = true;

    }
}


export class FeatureVector {
    constructor(
        node,
        vectorId,
        baseImage,
    ) {
        this.node = node;
        this.isVisible = false;

        this.version = node.attrs.version;
        this.name = node.attrs.name;
        this.vectorId = vectorId;
        this.resolutions = this.node.attrs.resolutions.sort((a, b) => b - a);
        this.sizeX = baseImage.sizeX;
        this.sizeY = baseImage.sizeY;
        this.tileSize = baseImage.tileSize;
        this.metadataName = null;
        this.metadataNode = null;
        this.metadataIsSparse = null;
        this.metadataFields = null;
        this.metadataFieldIdxs = null;
        this.metadataToType = null;
        this.metadataType = null;
        this.layer = null;

        this.currentFeature = undefined;

        this.metadataIsLoaded = false;

        this.projection = baseImage.projection
    }

    async init() {
        // await this.xx(), eventually put async here if you need
        return this;
    }

    static async create(node, vectorId, baseImage) {
        const instance = new FeatureVector(node, vectorId, baseImage);
        return await instance.init();
    }

    createLayer(useMetadata = true) {
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

            if (props == null || props[this.metadataName] == null) {
                return null;
            }

            if (this.metadataType == 'categorical') {
                const fieldIdx = props[this.metadataName].category;
                const field = this.metadataFields[fieldIdx];
                const view = v.fieldToView.get(field);
                if (this.vectorView.visibleFieldIndices.includes(fieldIdx)) {
                    if (props.isPoint) {
                        return new Style({
                            image: view.shape
                        });
                    } else {
                        const style = new Style({
                            fill: new Fill({color: view.fillColor}),
                            stroke: new Stroke({color: view.strokeColor, width: view.strokeWidth})
                        });
                        return style
                    }
                }
            } else {
                if (v.visibleFieldIndices.length == 0) {
                    if (props.isPoint) {
                        const shape = generateShape(v.featureView.shapeType, v.featureView.strokeWidth, v.featureView.strokeColor, '#aaaaaa');
                        return new Style({
                            image: shape
                        });
                    } else {
                        return new Style({
                            fill: new Fill({color: '#aaaaaa'}),
                            stroke: new Stroke({color: v.featureView.strokeColor, width: v.featureView.strokeWidth})
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
                        if (visibleIdx in obj) {
                            value = obj[visibleIdx];
                        } else {
                            throw new Error('metadata is not sparse and visible idx not found');
                        }
                    }

                    const fillColor = valueToColor(
                        vInfo.palette, value, vInfo.vMin, vInfo.vMax, vInfo.vCenter
                    );

                    if (props.isPoint) {
                        const shape = generateShape(v.featureView.shapeType, v.featureView.strokeWidth, v.featureView.strokeColor, fillColor);
                        return new Style({
                            image: shape
                        });
                    } else {
                        return new Style({
                            fill: new Fill({color: fillColor}),
                            stroke: new Stroke({color: v.featureView.strokeColor, width: v.featureView.strokeWidth})
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

        return { layer, vectorLoader };
    }

    initializeContinuousView() {
        const contFeatureView = {
            shapeType: 'circle',
            strokeWidth: 1.,
            strokeColor: '#dddddd',
        };
        contFeatureView.shape = generateShape(contFeatureView.shapeType, contFeatureView.strokeWidth, contFeatureView.strokeColor, '#aaaaaa');
        
        this.vectorView = {
            featureView: contFeatureView,
            fillOpacity: 1.0,
            strokeOpacity: 1.0,
            scale: 1.0,
            visibleFields: [],
            visibleFieldIndices: [],
        }
    }

    initializeCategoricalView() {
        this.fieldToColor = generateColorMapping(defaultPalettes.featurePallete, this.metadataFields);
        this.vectorView = {
            fieldToView: new globalThis.Map(),
            fillOpacity: 1.0,
            strokeOpacity: 1.0,
            scale: 1.0,
            visibleFields: [],
            visibleFieldIndices: [],
        };

        for (let i = 0; i < this.metadataFields.length; i++) {
            const field = this.metadataFields[i];
            const catFeatureView = {
                shapeType: 'circle',
                strokeWidth: 1.,
                strokeColor: '#dddddd',
                fillColor: this.fieldToColor.get(field)
            };
            catFeatureView.shape = generateShape(catFeatureView.shapeType, catFeatureView.strokeWidth, catFeatureView.strokeColor, catFeatureView.fillColor);

            this.vectorView.fieldToView.set(field, catFeatureView);
        }
    }

    async setMetadata(metadataName, metadataNode, map) {
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
                this.initializeCategoricalView();
            } else {
                let chunk;
                chunk = await get(await open(metadataNode.resolve('/metadata/vmins'), { kind: "array" }), [null]);
                const vmins = chunk.data;
                chunk = await get(await open(metadataNode.resolve('/metadata/vmaxs'), { kind: "array" }), [null]);
                const vmaxs = chunk.data;
                chunk = await get(await open(metadataNode.resolve('/metadata/vcenters'), { kind: "array" }), [null]);
                const vcenters = chunk.data;

                this.metadataFieldToVInfo = new Map();
                for (let i = 0; i < vmins.length; i++) {
                    let vCenter;
                    if (vcenters[i] == -99999) {
                        vCenter = null;
                    } else {
                        vCenter = vcenters[i];
                    }
                    this.metadataFieldToVInfo.set(
                        this.metadataFieldIdxs[i],
                        {
                            vMin: vmins[i],
                            vMax: vmaxs[i],
                            absoluteVMin: vmins[i],
                            absoluteVMax: vmaxs[i],
                            vCenter: vCenter,
                            vStepSize: .1,
                            palette: defaultPalettes.continousPalette,
                        }
                    );
                }

                this.initializeContinuousView();
            }
            
            obj = this.createLayer();
            this.vectorView.zarrVectorLoader = obj.vectorLoader;
    
            // if categorical all fields are visible by default
            if (this.metadataType == 'categorical') {
                this.vectorView.visibleFieldIndices = [...this.metadataFieldIdxs];
                this.vectorView.visibleFields = [...this.metadataFields];
            } else { // for continuous no field is visible by default
                this.vectorView.visibleFieldIndices = [];
                this.vectorView.visibleFields = []
            }
        } else {
            this.initializeContinuousView();
            obj = this.createLayer(false);
            this.vectorView.zarrVectorLoader = obj.vectorLoader;
        }

        if (this.layer) {
            map.removeLayer(this.layer);
        }

        this.layer = obj.layer;
        map.addLayer(obj.layer);

    }

    setFeatureToolTip(map, info) {
        const displayFeatureInfo = (pixel, target) => {
            const res = map.getView().getResolution();
            const feature = target.closest('.ol-control')
                ? undefined
                : map.forEachFeatureAtPixel(pixel, function (feature) {
                    return feature;
                });
            if (feature) {
                info.style.left = pixel[0] + 'px';
                info.style.top = pixel[1] + 'px';
                if (feature !== this.currentFeature) {
                    info.style.visibility = 'visible';

                    const identifier = feature.get('id')
                    let text = `id: ${identifier}\n`;

                    if (this.metadataType == 'categorical') {
                        const idx = feature.get('category');
                        const field = this.metadataFields[idx];
                        text = text + `${this.metadataName}: ${field}\n`;
                    } else {
                        const visibleIdx = this.vectorView.visibleFieldIndices[0];
                        const field = this.metadataFields[visibleIdx];
                        if (visibleIdx in feature.values_) {
                            const value = feature.get(visibleIdx);
                            text = text + `${field}: ${value}\n`;
                        }
                    }
                    info.innerText = text;
                }
            } else {
                info.style.visibility = 'hidden';
            }
            this.currentFeature = feature;
        };

        map.on('pointermove', function (evt) {
            if (evt.dragging) {
                info.style.visibility = 'hidden';
                this.currentFeature = undefined;
                return;
            }
            displayFeatureInfo(evt.pixel, evt.originalEvent.target);
        });

        map.on('click', function (evt) {
            displayFeatureInfo(evt.pixel, evt.originalEvent.target);
        });

        map.getTargetElement().addEventListener('pointerleave', function () {
            this.currentFeature = undefined;
            info.style.visibility = 'hidden';
        });
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
        this.layer.getSource().changed();
    }

    removeFeature(featureName) {
        const fieldIndex = this.vectorView.visibleFieldIndices.indexOf(featureName);

        this.vectorView.visibleFeatureIndices.splice(fieldIndex, 1);
        this.vectorView.visibleFields.splice(fieldIndex, 1);

        this.layer.getSource().changed();
    }

    setFeatureFillColor(featureName, hex) {
        this.vectorView.featureNameToView.get(featureName).fillColor = hex;
        this.layer.getSource().changed();
    }
}
