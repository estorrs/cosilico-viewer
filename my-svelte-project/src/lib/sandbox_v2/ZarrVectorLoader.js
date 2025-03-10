import VectorTile from 'ol/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import VectorTileLayer from 'ol/layer/VectorTile';
import { Feature } from 'ol';
import { ZipFileStore } from "@zarrita/storage";
import { open } from "@zarrita/core";
import { get, slice } from "@zarrita/indexing";
import GeoJSON from 'ol/format/GeoJSON.js';
import TileGrid from 'ol/tilegrid/TileGrid';



class ZarrVectorLoader {
    constructor(zarrUrl, fullImageHeight, fullImageWidth, pixelProjection, tileSize = 512, resolutions, featureGroup) {
        this.zarrUrl = zarrUrl;
        this.fullImageHeight = fullImageHeight;
        this.fullImageWidth = fullImageWidth; 
        this.projection = pixelProjection;
        this.tileSize = tileSize;
        this.resolutions = resolutions;
        this.featureGroup = featureGroup;
        this.node = null;

        this.format = new GeoJSON();

        this.tileGrid = new TileGrid({
            tileSize: tileSize,
            resolutions: resolutions.map(r => r / tileSize), // Normalize resolutions to pixel space
            extent: [0, 0, fullImageWidth, fullImageHeight] // Adjust based on full image size
        });
    
        this.initZarr();
        this.vectorTileSource = this.getVectorSource();
    }

    async initZarr() {
        try {
            // console.log(this.zarrUrl);
            const store = await ZipFileStore.fromUrl(this.zarrUrl);
            const node = await open(store); // Get the root structure
            this.node = await node
            console.log('Vector: node opened', this.node);
        } catch (error) {
            console.error("Vector: Error loading Zarr:", error);
        }
    }

    getVectorSource() {
        console.log('vector node', this.node);
        return new VectorTileSource({
            format: null, // 🔥 Prevents OpenLayers from automatically processing tile data
            // projection: this.projection,
            tileGrid: this.tileGrid,
            tileUrlFunction: function (tileCoord) {
                return `${tileCoord[0]}/${tileCoord[1]}/${tileCoord[2]}`;
            },
            tileLoadFunction: async (tile, url) => {
                if (tile instanceof VectorTile) {
                    const pieces = url.split('/');
                    const z = parseInt(pieces[0]);
                    const x = parseInt(pieces[1]);
                    const y = parseInt(pieces[2]);
                    console.log('Vector: call to z, x, y', z, x, y);
                    // console.log('x y z', x, y, z);
                    const resolution = this.resolutions[z];
                    // console.log('vectorsource resolutions', this.resolutions);
                    // console.log('vectorsource resolution', resolution);
                    const fg = this.featureGroup[z];

                    const groupPath = `/zooms/${resolution}/${x}_${y}/${fg}`;
                    console.log('Vector: getting vector tile for', groupPath);
                    const countPath = `${groupPath}/count`;
                    const featureIndexPath = `${groupPath}/feature_index`;
                    const idPath = `${groupPath}/id`;
                    const locationPath = `${groupPath}/location`;
        
                    let isPresent = true;
                    try {
                        const g = await open(this.node.resolve(groupPath), { kind: "group" });
                        // console.log('Vector: group found at path', groupPath);
                    }  catch (error) {
                        // console.log('Vector: group not found at path', groupPath);
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
            
                        // console.log('countsChunk', countsChunk);
                        // console.log('featureIndiciesChunk', featureIndiciesChunk);
                        // console.log('idsChunk', idsChunk);
                        // console.log('locationsXChunk', locationsXChunk);
                        // console.log('locationsYChunk', locationsYChunk);
            
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
                            // locationsY = this.fullImageHeight - locationsY;
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
                                    coordinates: [locationsX[i], this.fullImageHeight - locationsY[i]]
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
        
                    console.log('feature collection', z, x, y, featureCollection);
        

                    const features = this.format.readFeatures(featureCollection, {
                        featureProjection: this.projection,
                        dataProjection: this.projection,
                    });

                    tile.setFeatures(features); // Manually set features
                } else {
                    console.error("Tile is not a VectorTile:", tile);
                }
            }
        });
    }
}

export default ZarrVectorLoader;
