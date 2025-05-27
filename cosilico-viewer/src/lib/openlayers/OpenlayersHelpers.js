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

export function captureScreen(map) {
    const mapCanvas = document.createElement('canvas');
  const size = map.getSize();
  mapCanvas.width = size[0];
  mapCanvas.height = size[1];

  const context = mapCanvas.getContext('2d');

  // Only include canvas elements that are NOT inside the overview map
  const allCanvases = Array.from(document.querySelectorAll('.ol-layer canvas'));
  const filteredCanvases = allCanvases.filter(
    (canvas) => !canvas.closest('.ol-overviewmap')
  );

  filteredCanvases.forEach((canvas) => {
    if (canvas.width > 0 && canvas.height > 0) {
      const opacity = canvas.style.opacity || 1;
      context.globalAlpha = parseFloat(opacity);

      const transform = canvas.style.transform;
      const match = /matrix\(([^)]+)\)/.exec(transform);
      if (match) {
        const matrix = match[1].split(',').map(Number);
        context.setTransform(...matrix);
      } else {
        context.setTransform(1, 0, 0, 1, 0, 0);
      }

      context.drawImage(canvas, 0, 0);
    }
  });

  const dataURL = mapCanvas.toDataURL('image/png');

  const link = document.createElement('a');
  link.href = dataURL;
  link.download = 'map-screenshot.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
