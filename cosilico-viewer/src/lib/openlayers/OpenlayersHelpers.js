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