import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const isDev = process.env.NODE_ENV !== "production";

// Next.js 16's proxy/middleware always runs on the Node.js runtime, and
// OpenNext's Cloudflare adapter only supports Edge middleware — so a
// per-request nonce CSP (via proxy.ts) isn't an option on this stack.
// Headers are static instead, which means script-src needs 'unsafe-inline'
// to cover Next's own inline hydration/RSC-payload scripts (there are no
// inline <script> tags or dangerouslySetInnerHTML in this app's own code,
// so the residual risk is a future XSS sink, not anything present today).
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' https://accounts.google.com${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: https://*.openfoodfacts.org`,
  `font-src 'self' data:`,
  `connect-src 'self' https://accounts.google.com https://*.openfoodfacts.org${isDev ? " ws:" : ""}`,
  `frame-src https://accounts.google.com`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self)" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;
