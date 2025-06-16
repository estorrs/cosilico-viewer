import { continousPalettes, defaultPalettes } from '$lib/openlayers/ColorHelpers.js';


function parseNumber(value, digits=3) {
    if (value == null) {
        return value;
    }
    let formatted;
    if (value < 1 && value > -1) {
        formatted = parseFloat(value.toPrecision(digits));
    } else {
        formatted = parseFloat(value.toFixed(digits));
    }
    return formatted;
}

export function getScaleBar(resolution, Upp, maxPixelWidth, unit) {
        const steps = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]; // descending order
        const uppResolution = resolution * Upp; // real-world units per screen pixel

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i]; // in real-world units
            const pixelWidth = step / uppResolution; // pixels wide on screen

            if (pixelWidth <= maxPixelWidth) {
            return {
                label: `${step} ${unit}`,
                width: pixelWidth,
                value: step
            };
            }
        }

        // fallback: largest step (last one in list)
        const fallback = steps[steps.length - 1];
        return {
            label: `${fallback} ${unit}`,
            width: fallback / uppResolution,
            value: fallback
        };
    }

    // const resolution = map.getView().getResolution();
    

export function getClosestResolution(map, availableResolutions, tileSize) {
    let current = map.getView().getResolution();
    if (!current) return null;
    current = current * tileSize; // 512 

    return availableResolutions
        .filter(v => v > current)
        .reduce((prev, curr) =>
            curr < prev ? curr : prev,
            availableResolutions[0]
        );
}

// export function captureScreen(map) {
//     const mapCanvas = document.createElement('canvas');
//   const size = map.getSize();
//   mapCanvas.width = size[0];
//   mapCanvas.height = size[1];

//   const context = mapCanvas.getContext('2d');

//   // Only include canvas elements that are NOT inside the overview map
//   const allCanvases = Array.from(document.querySelectorAll('.ol-layer canvas'));
//   const filteredCanvases = allCanvases.filter(
//     (canvas) => !canvas.closest('.ol-overviewmap')
//   );

//   filteredCanvases.forEach((canvas) => {
//     if (canvas.width > 0 && canvas.height > 0) {
//       const opacity = canvas.style.opacity || 1;
//       context.globalAlpha = parseFloat(opacity);

//       const transform = canvas.style.transform;
//       const match = /matrix\(([^)]+)\)/.exec(transform);
//       if (match) {
//         const matrix = match[1].split(',').map(Number);
//         context.setTransform(...matrix);
//       } else {
//         context.setTransform(1, 0, 0, 1, 0, 0);
//       }

//       context.drawImage(canvas, 0, 0);
//     }
//   });

//   const dataURL = mapCanvas.toDataURL('image/png');

//   const link = document.createElement('a');
//   link.href = dataURL;
//   link.download = 'map-screenshot.png';
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
// }

export function getMapDataURL(map) {
    const canvas = document.createElement('canvas');
    const size = map.getSize();
    canvas.width = size[0];
    canvas.height = size[1];
    const ctx = canvas.getContext('2d');

    const canvases = Array.from(document.querySelectorAll('.ol-layer canvas')).filter(
        (c) => !c.closest('.ol-overviewmap') // exclude overview
    );

    canvases.forEach((layerCanvas) => {
        if (layerCanvas.width > 0 && layerCanvas.height > 0) {
            const opacity = layerCanvas.style.opacity || 1;
            ctx.globalAlpha = parseFloat(opacity);

            const transform = layerCanvas.style.transform;
            const match = /matrix\(([^)]+)\)/.exec(transform);
            if (match) {
                const matrix = match[1].split(',').map(Number);
                ctx.setTransform(...matrix);
            } else {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
            }

            ctx.drawImage(layerCanvas, 0, 0);
        }
    });

    return canvas.toDataURL('image/png');
}

function getSvgColorBar(hexs, gradientId = 'colorBar', x = 0, y = 0, width = 200, height = 20) {
  const stops = hexs.map((color, i) => {
    const offset = (i / (hexs.length - 1)) * 100;
    return `<stop offset="${offset}%" stop-color="${color}" />`;
  }).join('\n');

  return `
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
        ${stops}
      </linearGradient>
    </defs>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="url(#${gradientId})" stroke="#777" stroke-width="1" rx="4" ry="4" />
  `;
}

function buildSvgWithOverlay(map, experiment) {
    const dataURL = getMapDataURL(map);
    const [width, height] = map.getSize();

    let xOffset = width - 200; 
    let yOffset = 35;  

    let imageBlock = '';
    imageBlock = imageBlock + `<text x="${xOffset}" y="${yOffset}" text-anchor="left" font-size="24" fill="white" font-family="Helvetica, Arial, sans-serif" text-decoration="underline">Images</text>\n`;
    const imageOrder = experiment.imageOrder.filter((i) => !experiment.images.get(i).isVisible);
    for (const imageId of imageOrder) {
        yOffset = yOffset + 30;
        const image = experiment.images.get(imageId).image;
        imageBlock = imageBlock + `<text x="${xOffset}" y="${yOffset}" text-anchor="left" font-size="16" fill="white" font-family="Helvetica, Arial, sans-serif">${image.name}</text>\n`;
        for (const channelName of image.imageView.visibleChannelNames) {
            const view = image.imageView.channelNameToView.get(channelName);
            imageBlock = imageBlock + `<rect x="${xOffset}" y="${yOffset + 10}" width="20" height="20" fill="${view.color}" />\n`;
            imageBlock = imageBlock + `<text x="${xOffset + 30}" y="${yOffset + 23}" text-anchor="left" font-size="12" fill="white" font-family="Helvetica, Arial, sans-serif">${channelName}</text>\n`;
            yOffset = yOffset + 20;
        }
    }
    yOffset = yOffset + 50;


    let layerBlock = '';
    layerBlock = layerBlock + `<text x="${xOffset}" y="${yOffset}" text-anchor="left" font-size="24" fill="white" font-family="Helvetica, Arial, sans-serif" text-decoration="underline">Layers</text>\n`;

    const layerOrder = experiment.layerOrder.filter((l) => !experiment.layers.get(l).isVisible);
    for (const layerId of layerOrder) {
        const vector = experiment.layers.get(layerId).vector;
        const isPopulated = experiment.layers.get(layerId).isGrouped ? vector.vectorView.visibleFeatureNames.length > 0 : vector.vectorView.visibleFields.length > 0;
        if (experiment.layers.get(layerId).isGrouped && isPopulated) {
            yOffset = yOffset + 30;
            layerBlock = layerBlock + `<text x="${xOffset}" y="${yOffset}" text-anchor="left" font-size="16" fill="white" font-family="Helvetica, Arial, sans-serif">${vector.name}</text>\n`;
            for (const featureName of vector.vectorView.visibleFeatureNames) {
                let view = vector.vectorView.featureNameToView.get(featureName);
                layerBlock = layerBlock + `<rect x="${xOffset}" y="${yOffset + 10}" width="20" height="20" fill="${view.fillColor}" />\n`;
                layerBlock = layerBlock + `<text x="${xOffset + 30}" y="${yOffset + 23}" text-anchor="left" font-size="12" fill="white" font-family="Helvetica, Arial, sans-serif">${featureName}</text>\n`;
                yOffset = yOffset + 20;
            }
        } else if (!experiment.layers.get(layerId).isGrouped && isPopulated) {
            yOffset = yOffset + 30;
            layerBlock = layerBlock + `<text x="${xOffset}" y="${yOffset}" text-anchor="left" font-size="16" fill="white" font-family="Helvetica, Arial, sans-serif">${vector.name}</text>\n`;
            
            if (vector.metadataType == 'categorical') {
                for (const featureName of vector.vectorView.visibleFields) {
                    let view = vector.vectorView.fieldToView.get(featureName);
                    layerBlock = layerBlock + `<rect x="${xOffset}" y="${yOffset + 10}" width="20" height="20" fill="${view.fillColor}" />\n`;
                    layerBlock = layerBlock + `<text x="${xOffset + 30}" y="${yOffset + 23}" text-anchor="left" font-size="12" fill="white" font-family="Helvetica, Arial, sans-serif">${featureName}</text>\n`;
                    yOffset = yOffset + 20;
                }
            } else {
                const featureName = vector.vectorView.visibleFields[0];
                const hexs = continousPalettes[vector.vectorView.palette];
                
                const idx = vector.metadataFields.indexOf(featureName);
                const vmin = parseNumber(vector.metadataFieldToVInfo.get(idx).vMin);
                const vmax = parseNumber(vector.metadataFieldToVInfo.get(idx).vMax);
                const vcenter = parseNumber(vector.metadataFieldToVInfo.get(idx).vCenter);

                layerBlock = layerBlock + `<text x="${xOffset + 88}" y="${yOffset + 23}" text-anchor="middle" font-size="12" fill="white" font-family="Helvetica, Arial, sans-serif">${featureName}</text>\n`;
                const colorBarSvg = getSvgColorBar(hexs, 'legend-gradient', xOffset, yOffset + 28, 175, 20);
                layerBlock = layerBlock + `${colorBarSvg}\n`;
                layerBlock = layerBlock + `<text x="${xOffset}" y="${yOffset + 63}" text-anchor="center" font-size="12" fill="white" font-family="Helvetica, Arial, sans-serif">${vmin}</text>\n`;
                layerBlock = layerBlock + `<text x="${xOffset + 175}" y="${yOffset + 63}" text-anchor="end" font-size="12" fill="white" font-family="Helvetica, Arial, sans-serif">${vmax}</text>\n`;
                if (vcenter != null) {
                    layerBlock = layerBlock + `<text x="${xOffset + 88}" y="${yOffset + 63}" text-anchor="middle" font-size="12" fill="white" font-family="Helvetica, Arial, sans-serif">${vcenter}</text>\n`;
                }
                yOffset = yOffset + 60;

            }
        }
    }

    let legendX = width - 210;
    let legendY = 10;
    let legendWidth = 200;
    let legendHeight = yOffset + 10; // estimate after you've computed content

    const scaleObj = getScaleBar(map.getView().getResolution(), experiment.baseImage.upp, 100, experiment.baseImage.unit);


    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <image href="${dataURL}" x="0" y="0" width="${width}" height="${height}" />

  <!-- scale bar -->
  <rect x="20" y="${height - 40}" width="${scaleObj.width}" height="6" fill="white" />
  <text x="20" y="${height - 45}" text-anchor="left" font-size="12" fill="white" font-family="Helvetica, Arial, sans-serif">${scaleObj.label}</text>

  <!-- legend group with background -->
  <g>
    <rect 
      x="${legendX}" 
      y="${legendY}" 
      width="${legendWidth}" 
      height="${legendHeight}" 
      rx="10" 
      ry="10"
      fill="#000000" 
      fill-opacity="1" 
      stroke="#777777" 
      stroke-opacity="1.0"
    />
    ${imageBlock}
    ${layerBlock}
  </g>
</svg>
`;

    return svg;
}

export function captureScreen(map, experiment, name='view.svg') {
    const svgContent = buildSvgWithOverlay(map, experiment);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
