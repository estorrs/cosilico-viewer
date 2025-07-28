
// import { ZipFileStore } from "@zarrita/storage";
// import { ZipFileStore } from '@zarrita/storage/dist/fs/zip.js';
import ZipFileStore from "@zarrita/storage/zip";


import { open } from "@zarrita/core";
// import { get, slice } from "@zarrita/indexing";

import { DualURLRangeReader } from "$lib/DualURLRangeReader.js";

export async function initZarr({ getUrl, headUrl }) {
  const reader = new DualURLRangeReader(getUrl, headUrl);
  const store  = new ZipFileStore(reader);   // <- no `.fromUrl()` now
  return await open(store);                  // returns the root node
}

export async function printZarrTree(group, prefix = "") {
    const entries = await group.entries();
  
    for (const [name, entry] of entries) {
      if (entry.kind === "group") {
        console.log(`${prefix}${name}/`);
        const subGroup = await group.get(name);
        await printZarrTree(subGroup, prefix + "  ");
      } else if (entry.kind === "array") {
        console.log(`${prefix}${name} [array]`);
      } else {
        console.log(`${prefix}${name} [unknown]`);
      }
    }
  }

export function extractRows(chunk) {
  const { data, shape, stride } = chunk;
  const [numRows, numCols] = shape;
  const map = new Map();

  for (let row = 0; row < numRows; row++) {
    const offset = row * stride[0];
    const rowData = data.subarray(offset, offset + numCols);
    map.set(row, rowData);
  }

  return map;
}
