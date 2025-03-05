import DataTile from 'ol/source/DataTile.js';
import { open } from "@zarrita/core";
import { get } from "@zarrita/indexing";

class ZarrTile extends DataTile {
    constructor(tileCoord, source) {
        super(source.tileSize); // ✅ Match DataTile's constructor

        this.tileCoord = tileCoord;
        this.source = source;
        this.node = source.node;
        this.tIndex = source.tIndex;
        this.cIndices = source.cIndices;
        this.zIndex = source.zIndex;
        
        // Set dimensions
        this.tileSize = source.tileSize;
        this.bands = this.cIndices.length; // Number of bands
    }

    async loadTile() {
        try {
            const [z, x, y] = this.tileCoord;
            const resolution = this.source.resolutions[z];
            const tileArrayPath = `/zooms/${resolution}/tiles`;

            console.log('Getting array at', tileArrayPath);
            const arr = await open(this.node.resolve(tileArrayPath), { kind: "array" });

            // Allocate space for multi-band pixel data
            const totalPixels = this.tileSize * this.tileSize;



            const multiBandData = new Uint8Array(totalPixels * 4 + 123);

            for (let j = 0; j < totalPixels; j++) {
                multiBandData[j * 3 + 0] = 255;
                multiBandData[j * 3 + 1] = 0;
                multiBandData[j * 3 + 2] = 0;
                multiBandData[j * 3 + 3] = 255;
            }
            // return tileData;
            return multiBandData;





            // const multiBandData = new Uint8Array(totalPixels * this.bands);

            // for (let i = 0; i < this.bands; i++) {  
            //     const tileSlice = [x, y, this.tIndex, this.cIndices[i], this.zIndex, null, null];
            //     console.log('Getting tile slice', tileSlice);
            //     const tile = await get(arr, tileSlice);

            //     let tileData;
            //     if (tile.data instanceof Uint8Array) {
            //         tileData = new Uint8Array(tile.data);
            //     } else {
            //         throw new Error("Unsupported dtype");
            //     }

            //     for (let j = 0; j < totalPixels; j++) {
            //         // multiBandData[j * this.bands + i] = tileData[j] / 255.0; // Normalize to 0-1
            //         multiBandData[j * this.bands + i] = tileData[j];
            //     }
            // }

            // return multiBandData;

        } catch (error) {
            console.error("Error loading Zarr tile:", error);
            return null; // OpenLayers handles missing tiles
        }
    }
}

export { ZarrTile };
