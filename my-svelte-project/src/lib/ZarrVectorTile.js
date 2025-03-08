
// import VectorTile from 'ol/source/VectorTile';
import { VectorTile } from 'ol';
import { VectorRenderTile } from 'ol';
import GeoJSON from 'ol/format/GeoJSON.js';
import { open } from "@zarrita/core";
import { get, slice } from "@zarrita/indexing";

class ZarrVectorTile extends VectorTile {

    constructor(tileCoord, state, source, node, projection) {
        super(tileCoord, state, null, null, () => {});

        this.tileCoord = tileCoord;
        this.source = source;
        this.node = node;
        this.format = new GeoJSON();
        this.projection = projection;

        this.features = null;

        this.loadTile();
    }

    async loadTile() {
        try {
            const [z, x, y] = this.tileCoord;
            const resolution = this.source.resolutions[z];
            const featureGroup = this.source.featureGroup;

            const groupPath = `/zooms/${resolution}/${x}_${y}/${featureGroup}`;
            const countPath = `${groupPath}/count`;
            const featureIndexPath = `${groupPath}/feature_index`;
            const idPath = `${groupPath}/id`;
            const locationPath = `${groupPath}/location`;

            let isPresent = true;
            try {
                const g = await open(this.node.resolve(groupPath), { kind: "group" });
                console.log('Group found at path', groupPath);
            }  catch (error) {
                console.log('Group not found at path', groupPath);
                isPresent = false;
            }

            let featureCollection = {
                "type": "FeatureCollection",
                "features": [
                ]
            };

            if (isPresent) {
                const countArr = await open(this.node.resolve(countPath), { kind: "array" });
                const featureIndexArr = await open(this.node.resolve(featureIndexPath), { kind: "array" });
                const idArr = await open(this.node.resolve(idPath), { kind: "array" });
                const locationArr = await open(this.node.resolve(locationPath), { kind: "array" });
    
                const countsChunk = await get(countArr, [null]);
                const featureIndiciesChunk = await get(featureIndexArr, [null]);
                const idsChunk = await get(idArr, [null]);
                const locationsXChunk = await get(locationArr, [null, 0]);
                const locationsYChunk = await get(locationArr, [null, 1]);
    
                console.log('countsChunk', countsChunk);
                console.log('featureIndiciesChunk', featureIndiciesChunk);
                console.log('idsChunk', idsChunk);
                console.log('locationsXChunk', locationsXChunk);
                console.log('locationsYChunk', locationsYChunk);
    
                let counts;
                if (countsChunk.data instanceof Uint32Array) {
                    counts = new Uint32Array(countsChunk.data);
                } else {
                    console.log('chunk', countsChunk.data);
                    throw new Error("Unsupported count dtype");
                }
    
                let featureIndices;
                if (featureIndiciesChunk.data instanceof Uint32Array) {
                    featureIndices = new Uint32Array(featureIndiciesChunk.data);
                } else {
                    console.log(featureIndiciesChunk.data);
                    throw new Error("Unsupported feature indices dtype");
                }
    
                let locationsX;
                if (locationsXChunk.data instanceof Float32Array) {
                    locationsX = new Float32Array(locationsXChunk.data);
                } else {
                    console.log(locationsXChunk.data);
                    throw new Error("Unsupported locations dtype");
                }
    
                let locationsY;
                if (locationsYChunk.data instanceof Float32Array) {
                    locationsY = new Float32Array(locationsYChunk.data);
                } else {
                    console.log(locationsYChunk.data);
                    throw new Error("Unsupported locations dtype");
                }
    
                let ids = [];
                   
                for (let i = 0; i < counts.length; i++) {
                    const feature = {
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: [locationsX[i], locationsY[i]]
                        },
                        properties: {
                            "id": ids[i],
                            "feature_index": featureIndices[i],
                            "count": counts[i]
                        }
    
                    };
                    featureCollection.features.push(feature);
                }
            } 

            console.log('feature collection', featureCollection);

            // this.setFeatures(this.format.readFeatures(featureCollection, {
            //     featureProjection: this.projection,
            //     dataProjection: this.projection,
            // }));
            

            this.features = this.format.readFeatures(featureCollection, {
                featureProjection: this.projection,
                dataProjection: this.projection,
            });

            console.log('features', this.features);
            
            this.state = 2; // TileState.LOADED
            this.changed(); // Notify OpenLayers
        } catch (error) {
            console.error("Error loading Zarr vector tile:", error);
            this.state = 3; // TileState.ERROR
        }
    }

    getFeatures() {
        return this.features;
    }

}

export { ZarrVectorTile };


