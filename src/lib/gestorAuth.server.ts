import "server-only";
import { NextRequest } from "next/server";

const encoder = new TextEncoder();

const GESTOR_PASSWORD = process.env.GESTOR_PASSWORD ?? "ab123456";
const TOKEN_SECRET = process.env.GESTOR_TOKEN_SECRET ?? "dev-only-insecure-gestor-secret";
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8h — matches a typical work session

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(TOKEN_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Buffer.from(signature).toString("base64url");
}

export function verifyGestorPassword(password: string): boolean {
  return password.length > 0 && password === GESTOR_PASSWORD;
}

export async function createGestorToken(): Promise<string> {
  const payload = JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const signature = await hmac(payloadB64);
  return `${payloadB64}.${signature}`;
}

export async function verifyGestorToken(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return false;

  const expected = await hmac(payloadB64);
  if (expected !== signature) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function requireGestorAuth(request: NextRequest): Promise<boolean> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  return verifyGestorToken(token);
}
