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

