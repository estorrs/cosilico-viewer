
import ImageTile from 'ol/ImageTile';
import { open } from "@zarrita/core";
import { get, slice } from "@zarrita/indexing";

class ZarrTile extends ImageTile {
    constructor(tileCoord, state, source, node, tIndex, cIndex, zIndex) {
        super(tileCoord, state, null, null, () => {}); // ✅ Ensure all required arguments are passed

        this.source = source;
        this.node = node;
        this.tIndex = tIndex;
        this.cIndex = cIndex;
        this.zIndex = zIndex;
        this.image = document.createElement('canvas');
        this.image.width = source.tileSize;
        this.image.height = source.tileSize;

        this.loadTile();
    }

    async loadTile() {
        try {
            const [z, x, y] = this.tileCoord;
            const resolution = this.source.resolutions[z];
            const tileArrayPath = `/zooms/${resolution}/tiles`;
    
            console.log('Getting array at', tileArrayPath);
    
            const arr = await open(this.node.resolve(tileArrayPath), { kind: "array" });
           
            // ✅ Use `this.source.tIndex` and `this.source.zIndex`
            const tileSlice = [x, y, this.source.tIndex, this.source.cIndex, this.source.zIndex, null, null];
            const tile = await get(arr, tileSlice);

            let tileData;
            if (tile.data instanceof Uint8Array) {
                tileData = new Uint8ClampedArray(tile.data);
            } else {
                console.log(tile.data);
                throw new Error("Unsupported dtype");
            }
    
            let rgbaData = new Uint8ClampedArray(tileData.length * 4);
            for (let i = 0; i < tileData.length; i++) {
                rgbaData[i * 4] = tileData[i];     // R
                rgbaData[i * 4 + 1] = tileData[i]; // G
                rgbaData[i * 4 + 2] = tileData[i]; // B
                rgbaData[i * 4 + 3] = 255;       // A (fully opaque)
            }
    
            const ctx = this.image.getContext('2d');
            const imageData = ctx.createImageData(512, 512);
            imageData.data.set(rgbaData);
            ctx.putImageData(imageData, 0, 0);
            console.log(imageData);
    
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


