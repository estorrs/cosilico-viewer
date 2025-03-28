import { open } from "@zarrita/core";
import { get, slice } from "@zarrita/indexing";
import { Projection } from 'ol/proj';
import VectorTileLayer from 'ol/layer/VectorTile';
import { SvelteMap } from "svelte/reactivity";
import { Style } from "ol/style";


import ZarrVectorLoader from './ZarrVectorLoader';
import { generateColorMapping, defaultPalettes, categoricalPalettes } from './ColorHelpers';
import { generateShape } from "./ShapeHelpers";
import { initZarr } from "./ZarrHelpers";

export class FeatureGroupVector {
    constructor(
        node,
        vectorId,
        featureMetaToNode,
        baseTileSize,
    ) {
        this.node = node;

        this.version = node.attrs.version;
        this.name = node.attrs.name;
        this.vectorId = vectorId;
        this.resolutions = this.node.attrs.resolutions.sort((a, b) => b - a);
        this.sizeY = this.node.attrs.size[0];
        this.sizeX = this.node.attrs.size[1];
        this.tileSize = baseTileSize;
        this.featureMetaToNode = featureMetaToNode;

        this.currentFeature = undefined;

        this.isLoaded = false;

        this.projection = new Projection({
            code: 'PIXEL',
            units: 'pixels',
            extent: [0, 0, this.sizeX, this.sizeY],
        });

        this.populateInitialFields();
    }

    createLayer(featureGroup) {
        const vectorLoader = new ZarrVectorLoader(
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
            minResolution: .01,
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
            console.log('current map resolution', res);
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