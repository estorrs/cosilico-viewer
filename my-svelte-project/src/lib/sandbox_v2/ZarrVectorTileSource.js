import VectorTileSource from 'ol/source/VectorTile.js';
import { VectorRenderTile } from 'ol';
import TileGrid from 'ol/tilegrid/TileGrid';
import { ZipFileStore } from "@zarrita/storage";
import { open } from "@zarrita/core";

import { ZarrVectorTile } from './ZarrVectorTile';
import { Vector } from 'ol/source';


class ZarrVectorTileSource extends VectorTileSource {
    constructor(options) {
        const { url, fullImageHeight, fullImageWidth, pixelProjection, tileSize = 512, resolutions, featureGroup = 0 } = options;

        const tileGrid = new TileGrid({
            tileSize: tileSize,
            resolutions: resolutions.map(r => r / tileSize),
            extent: [0, 0, fullImageWidth, fullImageHeight],
        });

        console.log('VectorTileSource', VectorTileSource);

        // super({
        //     tileGrid,
        //     tileUrlFunction: () => null, // Not needed since we override getTile
        // });

        this.url = url;
        this.resolutions = resolutions;
        this.featureGroup = featureGroup;
        this.node = null;
        this.tileSize = tileSize;

        this.initZarr();
    }

    async initZarr() {
        try {
            const store = await ZipFileStore.fromUrl(this.url);
            const node = await open(store); // Get the root structure
            this.node = node
        } catch (error) {
            console.error("Error loading Zarr:", error);
        }
    }

    getTile(z, x, y, pixelRatio, projection) {
        if (!this.node) return null;
        console.log('loading tile');
        const tile = new ZarrVectorTile([z, x, y], 0, this, this.node, projection);
        return tile;
        // const features = tile.getFeatures();
        // return features;
    }

    
}

export default ZarrVectorTileSource;
