import "server-only";
import jpeg from "jpeg-js";

const MAX_DIMENSION = 500;
const JPEG_QUALITY = 80;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Nearest-neighbor downscale over the raw RGBA buffer jpeg-js decodes to.
// Cloudflare Workers doesn't allow compiling WASM from runtime-fetched bytes
// ("Wasm code generation disallowed by embedder"), which rules out
// WASM-based resizers (e.g. @cf-wasm/photon) here — jpeg-js is pure JS, so
// it just works, at the cost of a less sophisticated resize filter.
function downscale(data: Buffer, width: number, height: number, targetWidth: number, targetHeight: number): Buffer {
  const out = Buffer.alloc(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y++) {
    const srcY = Math.min(height - 1, Math.floor((y * height) / targetHeight));
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.min(width - 1, Math.floor((x * width) / targetWidth));
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * targetWidth + x) * 4;
      out[dstIdx] = data[srcIdx];
      out[dstIdx + 1] = data[srcIdx + 1];
      out[dstIdx + 2] = data[srcIdx + 2];
      out[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return out;
}

function compressJpeg(bytes: Uint8Array): string | null {
  try {
    const decoded = jpeg.decode(bytes, { maxResolutionInMP: 50 });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(decoded.width, decoded.height));
    const targetWidth = Math.max(1, Math.round(decoded.width * scale));
    const targetHeight = Math.max(1, Math.round(decoded.height * scale));

    const pixelData =
      scale < 1
        ? downscale(decoded.data as Buffer, decoded.width, decoded.height, targetWidth, targetHeight)
        : (decoded.data as Buffer);

    const encoded = jpeg.encode(
      { data: pixelData, width: targetWidth, height: targetHeight },
      JPEG_QUALITY
    );
    return `data:image/jpeg;base64,${uint8ArrayToBase64(encoded.data)}`;
  } catch {
    return null;
  }
}

// Fetches an external image and, when it's a JPEG (true for every source we
// use), re-encodes it smaller. Non-JPEG bytes are stored as-is rather than
// dropped — still correct, just without the size reduction.
export async function fetchAndCompressImage(
  url: string,
  fetchOptions?: RequestInit
): Promise<string | null> {
  try {
    const res = await fetch(url, fetchOptions);
    if (!res.ok) return null;

    const contentLength = res.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_SOURCE_BYTES) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_SOURCE_BYTES) return null;

    const bytes = new Uint8Array(buffer);
    if (isJpeg(bytes)) {
      const compressed = compressJpeg(bytes);
      if (compressed) return compressed;
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${contentType};base64,${uint8ArrayToBase64(bytes)}`;
  } catch {
    return null;
  }
}
