// DebounceUtils.js (or inline in each tile source)
const tileLoadQueue = new Map();

/**
 * Debounce tile loading by a short delay
 * @param {string} tileKey - Unique tile identifier
 * @param {Function} loaderFn - Function to run after debounce
 * @param {number} delay - Delay in ms
 */
export function debounceTileLoad(tileKey, loaderFn, delay = 150) {
    if (tileLoadQueue.has(tileKey)) {
        console.log('clearing timeout, about to restart');
        clearTimeout(tileLoadQueue.get(tileKey));
    }

    const timeout = setTimeout(() => {
        console.log('running function');
        loaderFn();
        tileLoadQueue.delete(tileKey);
    }, delay);

    console.log('setting queue');
    tileLoadQueue.set(tileKey, timeout);
}
