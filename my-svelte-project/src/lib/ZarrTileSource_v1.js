import DataTileSource from 'ol/source/DataTile.js';
import TileGrid from 'ol/tilegrid/TileGrid.js';
import { ZipFileStore } from "@zarrita/storage";
import { open } from "@zarrita/core";
import { ZarrTile } from './ZarrTile.js';

class ZarrTileSource extends DataTileSource {
    constructor(options) {
        const { url, fullImageHeight, fullImageWidth, pixelProjection, tileSize = 512, resolutions, tIndex = 0, cIndices = [0], zIndex = 0 } = options;

        const tileGrid = new TileGrid({
            tileSize: tileSize,
            resolutions: resolutions.map(r => r / tileSize), // Normalize resolutions to pixel space
            extent: [0, 0, fullImageWidth, fullImageHeight], // Adjust based on full image size
        });

        super({
            tileGrid,
            // bandCount: cIndices.length,
            bandCount: 4,
            tileSize: tileSize,
            projection: pixelProjection,
            // @ts-ignore
            loader: async (z, x, y) => this.loadTile(z, x, y), // 🔥 Use the custom loader function
        });

        this.url = url;
        this.tileSize = tileSize;
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
            this.node = await open(store); // Get the root structure
        } catch (error) {
            console.error("Error loading Zarr:", error);
        }
    }

    async loadTile(z, x, y) {
        console.log('load tile called');
        if (!this.node) return null;

        try {
            const tile = new ZarrTile([z, x, y], this);
            console.log('tile loaded', tile);
            const tileData = await tile.loadTile();
            console.log('tile data', tileData);
            return tileData;
            // return await tile.loadTile();
        } catch (error) {
            console.error(`Error loading tile (${z}, ${x}, ${y}):`, error);
            return null;
        }
    }

    setIndices(tIndex, cIndices, zIndex) {
        this.tIndex = tIndex;
        this.cIndices = cIndices;
        this.zIndex = zIndex;
    
        console.log("Updated indices:", { tIndex, cIndices, zIndex });
    
        this.changed(); // 🔥 Triggers a full refresh
    }
}

export default ZarrTileSource;
