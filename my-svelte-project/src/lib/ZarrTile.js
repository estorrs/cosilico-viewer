
import ImageTile from 'ol/ImageTile';

class ZarrTile extends ImageTile {
    constructor(tileCoord, state, source, zarrStore, tIndex, cIndices, zIndex) {
        super(tileCoord, state, null, null, () => {}); // ✅ Ensure all required arguments are passed

        this.source = source;
        this.zarrStore = zarrStore;
        this.tIndex = tIndex;
        this.cIndices = cIndices;
        this.zIndex = zIndex;
        this.image = document.createElement('canvas');
        this.image.width = 512;
        this.image.height = 512;

        this.loadTile();
    }

    async loadTile() {
        try {
            const [z, x, y] = this.tileCoord;
            const resolution = this.source.resolutions[z];
            const tileArrayPath = `/zooms/${resolution}/tiles`;
            const tileData = await this.zarrStore.get(tileArrayPath);
            const tileIndex = [x, y, this.tIndex, this.cIndices[0], this.zIndex, 512, 512];
            const tile = await tileData.get(tileIndex);

            // Draw tile
            const ctx = this.image.getContext('2d');
            const imageData = ctx.createImageData(512, 512);
            imageData.data.set(tile);
            ctx.putImageData(imageData, 0, 0);

            this.state = 2; // TileState.LOADED
            this.changed(); // Notify OpenLayers
        } catch (error) {
            console.error("Error loading Zarr tile:", error);
            this.state = 3; // TileState.ERROR
        }
    }

    getImage() {
        return this.image;
    }
}

export { ZarrTile };
