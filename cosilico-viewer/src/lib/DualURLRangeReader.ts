// src/lib/DualURLRangeReader.ts
// import type { Reader } from "@zarrita/storage";

/**  Minimal Reader that understands two presigned URLs  */
export class DualURLRangeReader {
  constructor(
    private readonly getUrl: string,
    private readonly headUrl: string,
    private readonly overrides: RequestInit = {}
  ) {}

  /** Called once by zarrita to learn the total length of the blob */
  async getLength(): Promise<number> {
    const res = await fetch(this.headUrl, {
      ...this.overrides,
      method: "HEAD",
    });

    const len = res.headers.get("Content-Length");
    if (!len) throw new Error("Content-Length missing from HEAD response");

    return Number(len);
  }

  /** Called many times to fetch byte ranges */
  async read(offset: number, length: number): Promise<Uint8Array> {
    const end = offset + length - 1; // inclusive
    const res = await fetch(this.getUrl, {
      ...this.overrides,
      method: "GET",
      headers: {
        Range: `bytes=${offset}-${end}`,
        ...(this.overrides.headers ?? {}),
      },
      cache: 'no-store'
    });
    if (res.status !== 206) {
      throw new Error(`Range GET failed: ${res.status} ${res.statusText}`);
    }
    const arr = new Uint8Array(await res.arrayBuffer());
    return arr;
  }
}




// export interface RangeReadable {
//   getLength(): Promise<number>;
//   read(offset: number, length: number): Promise<Uint8Array>;
// }

// export class DualURLRangeReader implements RangeReadable {
//   constructor(
//     private readonly url: string,              // single signed URL
//     private readonly overrides: RequestInit = {},
//     private       size?: number                // you may pass known size here
//   ) {}

//   /* 1️⃣  discover total length */
//   async getLength(): Promise<number> {
//     if (this.size) return this.size;           // caller supplied

//     // try a HEAD first — many signed URLs will fail with 403/400
//     const head = await fetch(this.url, {
//       ...this.overrides,
//       method: "HEAD",
//     }).catch(() => null);

//     const len = head?.headers.get("content-length");
//     if (head?.ok && len) {
//       this.size = +len;
//       return this.size;
//     }

//     // fallback: do a single GET (no Range) and cache the buffer
//     const buf = await this.fullDownload();
//     this.size = buf.length;
//     return this.size;
//   }

//   /* 2️⃣  read a byte-range (with graceful degradation) */
//   async read(offset: number, length: number): Promise<Uint8Array> {
//     const end = offset + length - 1;

//     // try Range request first
//     const res = await fetch(this.url, {
//       ...this.overrides,
//       method: "GET",
//       headers: {
//         Range: `bytes=${offset}-${end}`,
//         ...(this.overrides.headers ?? {}),
//       },
//     });

//     if (res.status === 206) {
//       return new Uint8Array(await res.arrayBuffer());
//     }

//     // server ignored Range → fall back to full download and slice
//     const buf = await this.fullDownload();
//     return buf.subarray(offset, offset + length);
//   }

//   /* helper: cache the full file so we only download once */
//   private fullBuf?: Uint8Array;
//   private async fullDownload(): Promise<Uint8Array> {
//     if (!this.fullBuf) {
//       const res = await fetch(this.url, { ...this.overrides, method: "GET" });
//       if (!res.ok) throw new Error(`GET failed: ${res.status} ${res.statusText}`);
//       this.fullBuf = new Uint8Array(await res.arrayBuffer());
//     }
//     return this.fullBuf;
//   }
// }
