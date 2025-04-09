import VectorTile from 'ol/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { open } from "@zarrita/core";
import { get, slice } from "@zarrita/indexing";
import GeoJSON from 'ol/format/GeoJSON.js';
import TileGrid from 'ol/tilegrid/TileGrid';


function extractVertices(data, shape, strides) {
    const [n, z, _] = shape;
    const [sN, sZ, sXY] = strides;

    const verticesX = [];
    const verticesY = [];

    for (let i = 0; i < n; i++) {
        let xs = [];
        let ys = [];
        for (let j = 0; j < z; j++) {
            const base = i * sN + j * sZ;
            const x = data[base + 0 * sXY];
            const y = data[base + 1 * sXY];
            if (x >= 0) {
                xs.push(x);
                ys.push(y);
            }
        }
        verticesX.push(xs);
        verticesY.push(ys);
    }

    return { verticesX, verticesY };
}

function extract2D(data, shape, strides) {
    const [n, d] = shape;
    const [strideN, strideD] = strides;

    const nested = [];

    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < d; j++) {
            const index = i * strideN + j * strideD;
            row.push(data[index]);
        }
        nested.push(row);
    }

    return nested;
}



export class GroupedZarrVectorLoader {
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

        this.format = new GeoJSON();

        this.tileGrid = new TileGrid({
            tileSize: tileSize,
            resolutions: resolutions.map(r => r / this.tileSize), // Normalize resolutions to pixel space
            extent: [0, 0, fullImageWidth, fullImageHeight] // Adjust based on full image size
        });
    
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

                    const groupPath = `/zooms/${resolution}/${x}_${y}/${fg}`;
                    const featureIndexPath = `${groupPath}/feature_index`;
                    const idPath = `${groupPath}/id`;
                    const idIdxsPath = `${groupPath}/id_idxs`;
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
                        const idIdxsArr = await open(this.node.resolve(idIdxsPath), { kind: "array" });
                        const locationArr = await open(this.node.resolve(locationPath), { kind: "array" });
            
                        const featureIndiciesChunk = await get(featureIndexArr, [null]);
                        const idsChunk = await get(idArr, [null]);
                        const idIdxsChunk = await get(idIdxsArr, [null]);
                        const locationsXChunk = await get(locationArr, [null, 0]);
                        const locationsYChunk = await get(locationArr, [null, 1]);

                        const featureIndices = featureIndiciesChunk.data;
                        const featureIds = idsChunk.data;
                        const idIdxs = idIdxsChunk.data;
                        const locationsX = locationsXChunk.data;
                        const locationsY = locationsYChunk.data;

                        const minIdx = idIdxs[0];
                        const maxIdx = idIdxs[idIdxs.length - 1];

                        let featureToData = new Map();
                        for (const [featureName, n] of this.featureToNode) {
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


export class ZarrVectorLoader {
    constructor(vectorNode, fullImageHeight, fullImageWidth, pixelProjection, tileSize, resolutions, metadataToNode, metadataToType, metadataToFieldIdxs, metadataToIsSparse) {
        this.isLoaded = false;
        this.node = vectorNode
        this.fullImageHeight = fullImageHeight;
        this.fullImageWidth = fullImageWidth; 
        this.projection = pixelProjection;
        this.tileSize = tileSize;
        this.resolutions = resolutions;
        this.metadataToNode = metadataToNode;
        this.metadataToType = metadataToType;
        this.metadataToFieldIdxs = metadataToFieldIdxs;
        this.metadataToIsSparse = metadataToIsSparse;

        this.format = new GeoJSON();

        this.tileGrid = new TileGrid({
            tileSize: tileSize,
            resolutions: resolutions.map(r => r / this.tileSize), // Normalize resolutions to pixel space
            extent: [0, 0, fullImageWidth, fullImageHeight] // Adjust based on full image size
        });
    
        this.vectorTileSource = this.getVectorSource();
    }

    getVectorSource() {
        return new VectorTileSource({
            format: null,
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

                    const groupPath = `/zooms/${resolution}/${x}_${y}`;
                    // console.log('Feature Vector: getting vector tile for', groupPath);

                    const idPath = `${groupPath}/id`;
                    const idxPath = `${groupPath}/id_idxs`;
                    const verticesPath = `${groupPath}/vertices`;
        
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
                        const idArr = await open(this.node.resolve(idPath), { kind: "array" });
                        const idxArr = await open(this.node.resolve(idxPath), { kind: "array" });
                        const verticesArr = await open(this.node.resolve(verticesPath), { kind: "array" });
            
                        const idChunk = await get(idArr, [null]);
                        const idxChunk = await get(idxArr, [null]);
                        const verticesChunk = await get(verticesArr, [null, null, null]);

                        const featureIds = idChunk.data;
                        const featureIdxs = idxChunk.data;
                        const n_verts = verticesChunk.shape[1];
                        const verts = extractVertices(verticesChunk.data, verticesChunk.shape, verticesChunk.stride)
                        const xVertices = verts.verticesX;
                        const yVertices = verts.verticesY;

                        
                        const minIdx = featureIdxs[0];
                        const maxIdx = featureIdxs[featureIdxs.length - 1];

                        let metadataToData = new Map();
                        for (const [metadataName, n] of this.metadataToNode) {
                            const fields = this.metadataToFieldIdxs.get(metadataName);
                            const isSparse = this.metadataToIsSparse.get(metadataName);
                            const metadataType = this.metadataToType.get(metadataName);

                            let entities = [];
                            if (metadataType == 'categorical') {
                                const path = `/object/${resolution}`;
                                const arr = await open(n.resolve(path), { kind: "array" });
                                const chunk = await get(arr, [slice(minIdx, maxIdx)]);
                                const data = chunk.data
                                // const data = extract2D(chunk.data, chunk.shape, chunk.stride);
                                for (let i = 0; i < data.length; i++) {
                                    entities.push({'category': data[i]});
                                }
                            } else if (!isSparse) {
                                const path = `/object/${resolution}`;
                                const arr = await open(n.resolve(path), { kind: "array" });
                                const chunk = await get(arr, [slice(minIdx, maxIdx), null]);
                                const data = extract2D(chunk.data, chunk.shape, chunk.stride);
                                for (let i = 0; i < data.length; i++) {
                                    const row = data[i];
                                    let obj = {};
                                    for (let j = 0; j < fields.length; j++) {
                                        const field = fields[j];
                                        obj[field] = row[j];
                                    }
                                    entities.push(obj);
                                }
                            } else {
                                const mapping = new Map();
                                const sparseIdsArr = await open(n.resolve(`${groupPath}/ids`), { kind: "array" });
                                const sparseValuesArr = await open(n.resolve(`${groupPath}/values`), { kind: "array" });
                                const sparseFieldsArr = await open(n.resolve(`${groupPath}/feature_indices`), { kind: "array" });

                                const sparseIdsChunk = await get(sparseIdsArr, [null]);
                                const sparseValuesChunk = await get(sparseValuesArr, [null]);
                                const sparseFieldsChunk = await get(sparseFieldsArr, [null]);

                                for (let i = 0; i < sparseIdsChunk.data.length; i++) {
                                    const sId = sparseIdsChunk.data[i];
                                    const sVal = sparseValuesChunk.data[i];
                                    const sField = sparseFieldsChunk.data[i];

                                    if (!mapping.has(sId)) {
                                        mapping.set(sId, new Map());
                                    }

                                    mapping.get(sId).set(sField, sVal);
                                }

                                for (const fId of featureIds) {
                                    let obj = {};
                                    if (mapping.has(fId)) {
                                        obj = mapping.get(fId);
                                    }
                                    entities.push(obj);
                                }
                            }
                            metadataToData.set(metadataName, entities);
                        }

                        for (let i = 0; i < featureIds.length; i++) {
                            const featXVerts = xVertices[i];
                            const featYVerts = yVertices[i];
                            
                            let geometry = null;
                            let isPoint = false;
                            if (n_verts == 1) {
                                geometry = {
                                    type: 'Point',
                                    coordinates: [featXVerts[0], this.fullImageHeight - featYVerts[0]],
                                };
                                isPoint = true;
                            } else {
                                let coordinates = []
                                for (let j = 0; j < featXVerts.length; j++) {
                                    coordinates.push([featXVerts[j], this.fullImageHeight - featYVerts[j]])
                                }
                                geometry = {
                                    type: 'Polygon',
                                    coordinates: [coordinates]
                                }
                            }

                            let props = {
                                "id": featureIds[i],
                                'isPoint': isPoint
                            }
                            for (const [metadataName, entities] of metadataToData) {
                                props[metadataName] = entities[i];
                            }

                            const feature = {
                                type: 'Feature',
                                geometry: geometry,
                                properties: props
                            }

                            // if (feature.properties.id == 'bbahjjpl-1') {
                            //     console.log('bbahjjpl-1', feature);
                            // }

                            featureCollection.features.push(feature);
                        }
                    } 
        
                    const features = this.format.readFeatures(featureCollection, {
                        featureProjection: this.projection,
                        dataProjection: this.projection,
                    });

                    tile.setFeatures(features);
                } else {
                    console.error("Tile is not a VectorTile:", tile);
                }
            }
        });
    }
}