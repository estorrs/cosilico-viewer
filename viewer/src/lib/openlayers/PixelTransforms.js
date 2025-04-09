export function hexToInt(hex) {
    return parseInt(hex, 16); // Convert hex string to an integer
}

export function intToHex(int) {
    return int.toString(16).padStart(6, "0").toUpperCase(); // Convert back to hex
}


/**
 * Convert grayscale pixel values to a pseudocolor RGBA pixel.
 *
 * @param {string[]} colors - List of colors (hex format, e.g., ['#FF0000', '#00FF00', '#0000FF'])
 * @param {number[]} pixelValues - List of grayscale values (0-255) corresponding to each channel
 * @returns {Uint8ClampedArray} - RGBA pixel data (length = 4)
 */
export function applyPseudocolorToPixel(colors, pixelValues) {
    if (colors.length !== pixelValues.length) {
        throw new Error("Number of colors must match the number of pixel values.");
    }

    let r = 0, g = 0, b = 0, a = 255;

    // Convert hex colors to RGB
    const colorRGBs = colors.map(hex => {
        const bigint = parseInt(hex.slice(1), 16);
        return [
            (bigint >> 16) & 255,  // Red
            (bigint >> 8) & 255,   // Green
            bigint & 255           // Blue
        ];
    });

    // Blend all pixel values using their assigned colors
    for (let i = 0; i < pixelValues.length; i++) {
        const intensity = pixelValues[i] / 255; // Normalize to [0,1]
        r += colorRGBs[i][0] * intensity;
        g += colorRGBs[i][1] * intensity;
        b += colorRGBs[i][2] * intensity;
    }

    // Ensure values stay within valid range
    return new Uint8ClampedArray([
        Math.min(255, Math.round(r)),
        Math.min(255, Math.round(g)),
        Math.min(255, Math.round(b)),
        a // Alpha channel remains fully opaque
    ]);
}

/**
 * Normalize an array of pixel values using per-channel min/max ranges.
 * @param {number[]} pixelValues - Array of pixel values (one per channel).
 * @param {number[]} minValues - Array of minimum values per channel.
 * @param {number[]} maxValues - Array of maximum values per channel.
 * @returns {number[]} - Normalized pixel values.
 */
export function minMaxRangePixelTransform(pixelValues, minValues, maxValues) {
    if (pixelValues.length !== minValues.length || pixelValues.length !== maxValues.length) {
        console.log(pixelValues, minValues, maxValues);
        throw new Error("pixelValues, minValues, and maxValues must have the same length.");
    }

    return pixelValues.map((value, index) => {
        const minVal = minValues[index];
        const maxVal = maxValues[index];

        return Math.min(255, Math.max(0, ((value - minVal) / (maxVal - minVal)) * 255));
    });
}

