import "server-only";
import { NextRequest, NextResponse } from "next/server";

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB

export function tooLargeResponse() {
  return NextResponse.json(
    { ok: false, message: "Upload muito grande. Limite de 100MB." },
    { status: 413 }
  );
}

// Photos arrive as base64 inside a JSON body, so Content-Length (when the
// client sends it) is checked first to reject early, then the actual read
// bytes are checked too in case Content-Length is absent or understated.
export async function readJsonWithSizeLimit(
  request: NextRequest,
  maxBytes: number = MAX_UPLOAD_BYTES
): Promise<{ ok: true; body: unknown } | { ok: false }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    return { ok: false };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    return { ok: false };
  }

  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: true, body: null };
  }
}
