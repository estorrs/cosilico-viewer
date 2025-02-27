
import ImageTile from 'ol/ImageTile';
import { open } from "@zarrita/core";
import { get, slice } from "@zarrita/indexing";

/**
 * Convert grayscale images to a pseudocolor RGBA image.
 *
 * @param {string[]} colors - List of colors (hex format, e.g., ['#FF0000', '#00FF00', '#0000FF'])
 * @param {Uint8ClampedArray[]} grayscaleImages - List of grayscale images (each Uint8Array is 512x512, for example)
 * @param {number} width - Width of the images (assumed identical for all)
 * @param {number} height - Height of the images (assumed identical for all)
 * @returns {Uint8ClampedArray} - RGBA image data
 */
function applyPseudocolor(colors, grayscaleImages, width, height) {
    if (colors.length !== grayscaleImages.length) {
        throw new Error("Number of colors must match the number of grayscale images.");
    }

    const numPixels = width * height;
    const outputImage = new Uint8ClampedArray(numPixels * 4); // RGBA image

    // Convert hex colors to RGB
    const colorRGBs = colors.map(hex => {
        const bigint = parseInt(hex.slice(1), 16);
        return [
            (bigint >> 16) & 255,  // Red
            (bigint >> 8) & 255,   // Green
            bigint & 255           // Blue
        ];
    });

    // Process each pixel
    for (let i = 0; i < numPixels; i++) {
        let r = 0, g = 0, b = 0, a = 255;

        // Blend all grayscale images using their assigned colors
        for (let j = 0; j < grayscaleImages.length; j++) {
            const intensity = grayscaleImages[j][i] / 255; // Normalize to [0,1]
            r += colorRGBs[j][0] * intensity;
            g += colorRGBs[j][1] * intensity;
            b += colorRGBs[j][2] * intensity;
        }

        // Ensure values stay within valid range
        outputImage[i * 4] = Math.min(255, Math.round(r));
        outputImage[i * 4 + 1] = Math.min(255, Math.round(g));
        outputImage[i * 4 + 2] = Math.min(255, Math.round(b));
        outputImage[i * 4 + 3] = a; // Alpha is always fully opaque
    }

    return outputImage;
}



class ZarrTile extends ImageTile {
    constructor(tileCoord, state, source, node, tIndex, cIndices, zIndex) {
        super(tileCoord, state, null, null, () => {}); // ✅ Ensure all required arguments are passed

        this.source = source;
        this.node = node;
        this.tIndex = tIndex;
        this.cIndices = cIndices;
        this.zIndex = zIndex;
        this.image = document.createElement('canvas');
        this.image.width = 512;
        this.image.height = 512;
        this.colors = ['#FF0000', '#00FF00', '#0000FF', '#00FFFF'];

        this.loadTile();
    }

    async loadTile() {
        try {
            const [z, x, y] = this.tileCoord;
            const resolution = this.source.resolutions[z];
            const tileArrayPath = `/zooms/${resolution}/tiles`;
            console.log('getting array at ', tileArrayPath);

            const arr = await open(this.node.resolve(tileArrayPath), { kind: "array" });
            var grayscaleImages = [];
            for (let i = 0; i < this.cIndices.length; i++) {
                const tileSlice = [x, y, this.tIndex, this.cIndices[i], this.zIndex, null, null];
                console.log('getting tile slice ', tileSlice);
                const tile = await await get(arr, tileSlice);
                console.log('tile', tile);

                let tileData;
                if (tile.data instanceof Uint8Array) {
                    tileData = new Uint8ClampedArray(tile.data);
                } else {
                    console.log(tile.data);
                    throw new Error("Unsupported dtype");
                }

                grayscaleImages.push(tileData);
            }

            const rgbaData = applyPseudocolor(this.colors, grayscaleImages, this.image.width, this.image.height);
            console.log('rgba data', rgbaData);
            // // Assume `imageData` is your ImageData object
            // const rgbaData = new Uint8ClampedArray(512 * 512 * 4);
            // for (let i = 0; i < tileData.length; i++) {
            //     const intensity = tileData[i]; // Grayscale value
            //     rgbaData[i * 4] = intensity;     // Red
            //     rgbaData[i * 4 + 1] = intensity; // Green
            //     rgbaData[i * 4 + 2] = intensity; // Blue
            //     rgbaData[i * 4 + 3] = 255;       // Alpha (fully opaque)
            // }
    
            // Draw tile
            const ctx = this.image.getContext('2d');
            const imageData = ctx.createImageData(512, 512);
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
