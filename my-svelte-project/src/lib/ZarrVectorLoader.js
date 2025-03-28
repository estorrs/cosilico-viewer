import VectorTile from 'ol/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import VectorTileLayer from 'ol/layer/VectorTile';
import { Feature } from 'ol';
import { ZipFileStore } from "@zarrita/storage";
import { open } from "@zarrita/core";
import { get, slice } from "@zarrita/indexing";
import GeoJSON from 'ol/format/GeoJSON.js';
import TileGrid from 'ol/tilegrid/TileGrid';
import { printZarrTree } from './ZarrHelpers';



class ZarrVectorLoader {
    constructor(vectorNode, fullImageHeight, fullImageWidth, pixelProjection, tileSize, resolutions, featureGroup, featureToNode) {
        this.isLoaded = false;
        this.node = vectorNode
        this.fullImageHeight = fullImageHeight;
        this.fullImageWidth = fullImageWidth; 
        this.projection = pixelProjection;
        this.tileSize = tileSize;
        this.resolutions = resolutions;
        this.featureGroup = featureGroup.split(',');
        this.featureToNode = featureToNode;

        console.log('vector raw resolutions', this.resolutions);
        console.log('vector normalized resolutions', resolutions.map(r => r / 512));

        this.format = new GeoJSON();

        this.tileGrid = new TileGrid({
            tileSize: tileSize,
            resolutions: resolutions.map(r => r / this.tileSize), // Normalize resolutions to pixel space
            extent: [0, 0, fullImageWidth, fullImageHeight] // Adjust based on full image size
        });
        // this.tileGrid = new TileGrid({
        //     tileSize: 512,
        //     resolutions: resolutions.map(r => r / 512), // Normalize resolutions to pixel space
        //     extent: [0, 0, fullImageWidth, fullImageHeight] // Adjust based on full image size
        // });
    
        this.vectorTileSource = this.getVectorSource();
    }

    getVectorSource() {
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
                    const resolution = this.resolutions[z];
                    const fg = this.featureGroup[z];

                    console.log('vector: zoom is:', z);

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
                        const featureIndexArr = await open(this.node.resolve(featureIndexPath), { kind: "array" });
                        const idArr = await open(this.node.resolve(idPath), { kind: "array" });
                        const locationArr = await open(this.node.resolve(locationPath), { kind: "array" });
            
                        const featureIndiciesChunk = await get(featureIndexArr, [null]);
                        const idsChunk = await get(idArr, [null]);
                        const locationsXChunk = await get(locationArr, [null, 0]);
                        const locationsYChunk = await get(locationArr, [null, 1]);

                        const featureIndices = featureIndiciesChunk.data;
                        const featureIds = idsChunk.data;
                        const locationsX = locationsXChunk.data;
                        const locationsY = locationsYChunk.data;

                        const minIdx = featureIndices[0];
                        const maxIdx = featureIndices[featureIndices.length - 1];

                        let featureToData = new Map();
                        for (const [featureName, n] of this.featureToNode) {
                            const group = await open(n.resolve('/object'));
                            const path = `/object/${resolution}`;
                            const arr = await open(n.resolve(path), { kind: "array" });
                            const chunk = await get(arr, [slice(minIdx, maxIdx)]);
                            featureToData.set(featureName, chunk.data);
                        }

                        for (let i = 0; i < featureIndices.length; i++) {
                            const feature = {
                                type: "Feature",
                                geometry: {
                                    type: "Point",
                                    coordinates: [locationsX[i], this.fullImageHeight - locationsY[i]]
                                },
                                properties: {
                                    "id": featureIds[i],
                                    "feature_index": featureIndices[i],
                                }
            
                            };
                            for (const [featureName, data] of featureToData) {
                                feature.properties[featureName] = data[i];
                            }
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
