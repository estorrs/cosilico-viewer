import ImageTile from 'ol/ImageTile.js';
import { open } from "@zarrita/core";
import { get, slice } from "@zarrita/indexing";


function uint16ToUint8(src) {
  if (!(src instanceof Uint16Array)) {
    throw new TypeError("Expected Uint16Array as input");
  }

  // 1. find min & max
  let min = 0xffff;      // 65 535
  let max = 0x0000;

  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }

  // 2. allocate destination
  const dst = new Uint8Array(src.length);

  // 3. degenerate case: constant image ⇒ all zeros (same as Python path)
  if (max === min) {
    return dst;                     // already filled with 0 by default
  }

  // 4. linear scale and write to dst
  const scale = 255 / (max - min);

  for (let i = 0; i < src.length; i++) {
    // (Typed-array assignment truncates the float → uint8, matching numpy’s cast)
    dst[i] = (src[i] - min) * scale;
  }

  return dst;
}



class ZarrTile extends ImageTile {
    constructor(tileCoord, state, source, node, zoomArrs, tIndex, cIndex, zIndex) {
        super(tileCoord, state, null, null, () => { }); // ✅ Ensure all required arguments are passed

        this.source = source;
        this.node = node;
        this.zoomArrs = zoomArrs;
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
            // console.log('image: zoom is:', z);
            const tileKey = `img-${z}-${x}-${y}-${this.cIndex}-${this.zIndex}-${this.tIndex}`;
            // console.log('image: getting tile at', tileKey);

            const resolution = this.source.resolutions[z];
            const arr = this.zoomArrs.get(resolution);

            const tileSlice = [x, y, this.source.tIndex, this.source.cIndex, this.source.zIndex, null, null];
            const tile = await get(arr, tileSlice);

            let tileData;
            if (tile.data instanceof Uint8Array) {
                tileData = new Uint8ClampedArray(tile.data);
            } else if (tile.data instanceof Uint16Array) {
                tileData = uint16ToUint8(tile.data);
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

            const ctx = this.image.getContext('2d', { willReadFrequently: true });
            const imageData = ctx.createImageData(this.source.tileSize, this.source.tileSize);
            imageData.data.set(rgbaData);
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


