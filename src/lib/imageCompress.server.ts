import "server-only";
import { PhotonImage, SamplingFilter, resize } from "@cf-wasm/photon";

const MAX_DIMENSION = 500;
const JPEG_QUALITY = 80;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024; // Workers memory cap guard

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Fetches an external image and re-encodes it as a small JPEG data URL, so
// every source (Open Food Facts, Open Products Facts, Cosmos) ends up the
// same reasonable size regardless of how big the original was.
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

    const inputImage = PhotonImage.new_from_byteslice(new Uint8Array(buffer));
    const width = inputImage.get_width();
    const height = inputImage.get_height();
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));

    const outputImage =
      scale < 1
        ? resize(
            inputImage,
            Math.round(width * scale),
            Math.round(height * scale),
            SamplingFilter.Lanczos3
          )
        : inputImage;

    const jpegBytes = outputImage.get_bytes_jpeg(JPEG_QUALITY);
    const base64 = uint8ArrayToBase64(jpegBytes);

    inputImage.free();
    if (outputImage !== inputImage) outputImage.free();

    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
}
