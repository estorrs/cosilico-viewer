import TileImage from 'ol/source/TileImage';
import DataTileSource from 'ol/source/DataTile';
import TileGrid from 'ol/tilegrid/TileGrid';
// import * as zarr from 'zarr';
import { ZipFileStore } from "@zarrita/storage";
import { open } from "@zarrita/core";

import { ZarrTile } from './ZarrTile';


class ZarrTileSource extends TileImage {
    constructor(options) {
        const { url, fullImageHeight, fullImageWidth, tileSize = 512, resolutions, tIndex = 0, cIndices = [0], zIndex = 0 } = options;

        const tileGrid = new TileGrid({
            tileSize: tileSize,
            resolutions: resolutions.map(r => r / tileSize), // Normalize resolutions to pixel space
            extent: [0, 0, fullImageWidth, fullImageHeight] // Adjust based on full image size
        });

        super({
            tileGrid,
            tileUrlFunction: () => null, // Not needed since we override getTile
        });

        this.url = url;
        this.resolutions = resolutions;
        this.tIndex = tIndex;
        this.cIndices = cIndices;
        this.zIndex = zIndex;
        this.node = null;

        console.log('c index', this.cIndices);
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
        return new ZarrTile([z, x, y], 0, this, this.node, this.tIndex, this.cIndices, this.zIndex);
    }
    
    setIndices(tIndex, cIndices, zIndex) {
        this.tIndex = tIndex;
        this.cIndices = cIndices;
        this.zIndex = zIndex;
    
        console.log("Updated indices:", { tIndex, cIndices, zIndex });
    
        // ✅ Tell OpenLayers that tiles have changed
        this.changed(); 
    }

  
    
    
}

export default ZarrTileSource;
