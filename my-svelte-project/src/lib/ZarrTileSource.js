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

        this.node = node;
        this.resolutions = resolutions;
        this.tIndex = tIndex;
        this.cIndex = cIndex;
        this.zIndex = zIndex;
        this.tileSize = tileSize;

    }

    getTile(z, x, y, pixelRatio, projection) {
        if (!this.node) return null;
        return new ZarrTile([z, x, y], 0, this, this.node, this.tIndex, this.cIndex, this.zIndex);
    }

    
}

export default ZarrTileSource;
