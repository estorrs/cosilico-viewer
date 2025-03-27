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
    constructor(vectorNode, fullImageHeight, fullImageWidth, pixelProjection, tileSize = 512, resolutions, featureGroup) {
        this.isLoaded = false;
        this.node = vectorNode
        this.fullImageHeight = fullImageHeight;
        this.fullImageWidth = fullImageWidth; 
        this.projection = pixelProjection;
        this.tileSize = tileSize;
        this.resolutions = resolutions;
        this.featureGroup = featureGroup.split(',');

        this.format = new GeoJSON();

        this.tileGrid = new TileGrid({
            tileSize: tileSize,
            resolutions: resolutions.map(r => r / tileSize), // Normalize resolutions to pixel space
            extent: [0, 0, fullImageWidth, fullImageHeight] // Adjust based on full image size
        });
    
        console.log('vector loader, node is', this.node);

        this.vectorTileSource = this.getVectorSource();
    }

    getVectorSource() {
        console.log('vector node', this.node);
        return new VectorTileSource({
            format: null, // 🔥 Prevents OpenLayers from automatically processing tile data
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
                    const resolution = this.resolutions[z];
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
                    }  catch (error) {
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
