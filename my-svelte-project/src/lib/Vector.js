import { open } from "@zarrita/core";
import { get, slice } from "@zarrita/indexing";
import { Projection } from 'ol/proj';
import VectorTileLayer from 'ol/layer/VectorTile';
import { SvelteMap } from "svelte/reactivity";
import { Style } from "ol/style";


import ZarrVectorLoader from './ZarrVectorLoader';
import { generateColorMapping, defaultPalettes, categoricalPalettes } from './ColorHelpers';
import { generateShape } from "./ShapeHelpers";

export class FeatureGroupVector {
    constructor(
        node,
        vectorId,
        map
    ) {
        this.node = node;
        this.map = map;

        this.version = node.attrs.version;
        this.name = node.attrs.name;
        this.vectorId = vectorId;
        this.resolutions = this.node.attrs.resolutions.sort((a, b) => b - a);
        this.sizeY = this.node.attrs.size[0];
        this.sizeX = this.node.attrs.size[1];
        this.tileSize = this.resolutions[this.resolutions.length - 1];
        this.layer = null;
        this.isLoaded = false;

        this.projection = new Projection({
            code: 'PIXEL',
            units: 'pixels',
            extent: [0, 0, this.sizeX, this.sizeY],
        });

        this.populateInitialFields();
    }

    addFeature(featureName, map) {
        // @ts-ignore
        const featureIndex = this.featureNames.indexOf(featureName);
        const featureGroup = this.featureGroups[featureIndex];

        this.vectorLoader.addFeatureGroup(featureGroup);

        // const vectorTileSource = this.vectorLoader.vectorTileSource;

        // const vectorTileStyle = (feature) => {
        //     const idx = feature.values_.feature_index;
        //     const name = this.featureNames[idx];
        //     if (this.vectorView.visibleFeatureIndices.includes(idx)) {
        //         return new Style({
        //             image: this.vectorView.featureNameToView.get(name).shape
        //         });
        //     }
        // }


        // const layer = new VectorTileLayer({
        //     source: vectorTileSource,
        //     style: vectorTileStyle,
        // });

        // map.addLayer(layer);

        // this.featureNameToLayer.set(featureName, layer);

        this.vectorView.visibleFeatureIndices.push(featureIndex);
        this.vectorView.visibleFeatureGroups.push(featureGroup);
        this.vectorView.visibleFeatureNames.push(featureName);

        this.layer.getSource().changed();
    }

    removeFeature(featureName, map) {
        const featureIndex = this.vectorView.visibleFeatureNames.indexOf(featureName);
        const featureGroup = this.vectorView.visibleFeatureGroups[featureIndex];

        this.vectorView.visibleFeatureIndices.splice(featureIndex, 1);
        this.vectorView.visibleFeatureGroups.splice(featureIndex, 1);
        this.vectorView.visibleFeatureNames.splice(featureIndex, 1);

        this.vectorLoader.removeFeatureGroup(featureGroup);

        this.layer.getSource().changed();

        // const layer = this.featureNameToLayer.get(featureName);

        // layer.getSource().changed();

        // map.removeLayer(layer);
        // this.featureNameToLayer.delete(featureGroup);
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

        // this.featureNameToLayer = new SvelteMap();

        this.featureToColor = generateColorMapping(defaultPalettes.featurePallete, this.featureNames);

        this.vectorLoader = new ZarrVectorLoader(
            this.node,
            this.sizeY,
            this.sizeX,
            this.projection,
            this.tileSize,
            this.resolutions,
        );
        //create view
        this.vectorView = {
            featureNameToView: new globalThis.Map(),
            fillOpacity: 1.0,
            strokeOpacity: 1.0,
            visibleFeatureNames: [],
            visibleFeatureGroups: [],
            visibleFeatureIndices: [],
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

        const vectorTileStyle = (feature) => {
            const idx = feature.values_.feature_index;
            const name = this.featureNames[idx];
            if (this.vectorView.visibleFeatureIndices.includes(idx)) {
                return new Style({
                    image: this.vectorView.featureNameToView.get(name).shape
                });
            }
        }

        this.layer = new VectorTileLayer({
            source: this.vectorLoader.vectorTileSource,
            style: vectorTileStyle,
        });

        this.map.addLayer(this.layer);

        this.isLoaded = true;

    }
}