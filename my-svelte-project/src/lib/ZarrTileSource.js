import TileImage from 'ol/source/TileImage';
import TileGrid from 'ol/tilegrid/TileGrid';
import * as zarr from 'zarr';
import { ZarrTile } from './ZarrTile';

class ZarrTileSource extends TileImage {
    constructor(options) {
        const { url, tileSize = 512, resolutions, tIndex = 0, cIndices = [0], zIndex = 0 } = options;

        const tileGrid = new TileGrid({
            tileSize: tileSize,
            resolutions: resolutions.map(r => r / 512), // Normalize resolutions to pixel space
            extent: [0, 0, 10000, 8000] // Adjust based on full image size
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
        this.zarrStore = null;
        this.initZarr();
    }

    async initZarr() {
        try {
            const store = new zarr.HTTPStore(this.url);
            this.zarrStore = await zarr.openGroup(store, '/', 'r');
        } catch (error) {
            console.error("Error loading Zarr:", error);
        }
    }

    getTile(z, x, y, pixelRatio, projection) {
        if (!this.zarrStore) return null;
        return new ZarrTile([z, x, y], 0, this, this.zarrStore, this.tIndex, this.cIndices, this.zIndex);
    }
}

export default ZarrTileSource;
