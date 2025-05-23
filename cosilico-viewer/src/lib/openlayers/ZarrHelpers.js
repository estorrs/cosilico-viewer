// @ts-nocheck

import { ZipFileStore } from "@zarrita/storage";
import { open } from "@zarrita/core";
import { get, slice } from "@zarrita/indexing";

export async function initZarr(zarrUrl) {
    try {
        // console.log(this.zarrUrl);
        const store = await ZipFileStore.fromUrl(zarrUrl);
        const node = await open(store); // Get the root structure

        console.log('node opened at', zarrUrl);
        return node;
    } catch (error) {
        console.error("Error loading Zarr:", error);
    }
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
