import TileImage from 'ol/source/TileImage';
import DataTileSource from 'ol/source/DataTile';
import TileGrid from 'ol/tilegrid/TileGrid';
// import * as zarr from 'zarr';
import { ZipFileStore } from "@zarrita/storage";
import { open } from "@zarrita/core";

import { ZarrTile } from './ZarrTile';


class ZarrTileSource extends TileImage {
    constructor(options) {
        const { node, fullImageHeight, fullImageWidth, tileSize = 512, resolutions, tIndex = 0, cIndex = 0, zIndex = 0 } = options;
        const tileGrid = new TileGrid({
            tileSize: tileSize,
            resolutions: resolutions.map(r => r / tileSize), // Normalize resolutions to pixel space
            extent: [0, 0, fullImageWidth, fullImageHeight] // Adjust based on full image size
        });

        super({
            tileGrid,
            tileUrlFunction: () => null, // Not needed since we override getTile
        });

        this.isLoaded = false;

        this.node = node;
        this.resolutions = resolutions;
        this.tIndex = tIndex;
        this.cIndex = cIndex;
        this.zIndex = zIndex;
        this.tileSize = tileSize;

        this.loadGenerationCounter = 0;

        // this.initializeArrs();

    }

    async init() {
        await this.initializeArrs();
        return this;
    }

    static async create(options) {
        const instance = new ZarrTileSource(options);
        return await instance.init();
    }

    async initializeArrs() {
        // preload array locations
        this.zoomArrs = new Map();
        for (const res of this.resolutions) {
            const tileArrayPath = `/zooms/${res}/tiles`;
            const arr = await open(this.node.resolve(tileArrayPath), { kind: "array" });
            this.zoomArrs.set(res, arr);
        }
        this.isLoaded = true
    }

    getTile(z, x, y, pixelRatio, projection) {
        if (!this.node) return null;
        if (!this.isLoaded) return null;
        return new ZarrTile([z, x, y], 0, this, this.node, this.zoomArrs, this.tIndex, this.cIndex, this.zIndex);
    }

    
}

export default ZarrTileSource;
