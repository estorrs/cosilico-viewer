// @ts-nocheck

import { Circle, RegularShape, Fill, Stroke } from "ol/style";

/**
 * Generate an OpenLayers shape based on the input parameters.
 *
 * @param {string} shapeName - The name of the shape ('circle', 'uptriangle', 'righttriangle', 'lefttriangle', 'downtriangle', 'square', 'diamond', 'cross', 'xcross', 'star')
 * @param {number} strokeWidth - The width of the stroke
 * @param {string} strokeColor - The color of the stroke (hex, rgba, etc.)
 * @param {string} fillColor - The fill color (hex, rgba, etc.)
 * @returns {Circle | RegularShape} - An OpenLayers style shape object
 */
export function generateShape(shapeName, strokeWidth = 1., strokeColor = "#dddddd", fillColor = "#aaaaaa", scaleFactor = 1.0) {
    // Define stroke and fill styles
    const stroke = new Stroke({ color: strokeColor, width: strokeWidth });
    const fill = new Fill({ color: fillColor });

    switch (shapeName.toLowerCase()) {
        case "circle":
            return new Circle({
                radius: 8 * scaleFactor,
                fill,
                stroke,
            });

        case "uptriangle":
            return new RegularShape({
                points: 3,
                radius: 10 * scaleFactor,
                fill,
                stroke,
                angle: 0, // Triangle facing up
            });

        case "righttriangle":
            return new RegularShape({
                points: 3,
                radius: 10 * scaleFactor,
                fill,
                stroke,
                angle: Math.PI / 2, // Rotate 90° to face right
            });

        case "downtriangle":
            return new RegularShape({
                points: 3,
                radius: 10 * scaleFactor,
                fill,
                stroke,
                angle: Math.PI, // Rotate 180° to face down
            });

        case "lefttriangle":
            return new RegularShape({
                points: 3,
                radius: 10 * scaleFactor,
                fill,
                stroke,
                angle: (3 * Math.PI) / 2, // Rotate 270° to face left
            });

        case "square":
            return new RegularShape({
                points: 4,
                radius: 10 * scaleFactor,
                fill,
                stroke,
                angle: 0, // Regular square
            });

        case "diamond":
            return new RegularShape({
                points: 4,
                radius: 10 * scaleFactor,
                fill,
                stroke,
                angle: Math.PI / 4, // Rotate 45° to form a diamond
            });

        case "cross":
            return new RegularShape({
                points: 4,
                radius: 10 * scaleFactor,
                radius2: 5 * scaleFactor, // Inner radius to make it a cross
                fill,
                stroke,
                angle: 0,
            });

        case "xcross":
            return new RegularShape({
                points: 4,
                radius: 10 * scaleFactor,
                radius2: 5 * scaleFactor, // Inner radius to make it an "X"
                fill,
                stroke,
                angle: Math.PI / 4, // Rotate 45° to make it an X-cross
            });

        case "star":
            return new RegularShape({
                points: 5,
                radius: 10 * scaleFactor,
                radius2: 4 * scaleFactor, // Inner radius for star effect
                fill,
                stroke,
                angle: 0,
            });

        default:
            throw new Error(`Invalid shape name: ${shapeName}`);
    }
}
