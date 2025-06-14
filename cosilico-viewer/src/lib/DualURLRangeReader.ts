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
    if (!res.ok)
      throw new Error(`HEAD failed: ${res.status} ${res.statusText}`);

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
    });
    if (res.status !== 206) {
      throw new Error(`Range GET failed: ${res.status} ${res.statusText}`);
    }
    return new Uint8Array(await res.arrayBuffer());
  }
}
