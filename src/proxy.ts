import { NextRequest, NextResponse } from "next/server";

// Per-request nonce for CSP script-src. Next.js reads the nonce back out of
// the Content-Security-Policy response header and applies it automatically
// to the inline hydration/RSC-payload scripts it injects, so this is the
// only way to keep script-src free of 'unsafe-inline' with the App Router.
export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID();
  const isDev = process.env.NODE_ENV !== "production";

  const csp = [
    `default-src 'self'`,
    // 'unsafe-eval' + ws: only in dev — Fast Refresh and the HMR socket need them.
    `script-src 'self' 'nonce-${nonce}' https://accounts.google.com${isDev ? " 'unsafe-eval'" : ""}`,
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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), geolocation=(self)");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  return response;
}

export const config = {
  matcher: [
    // Skip Next's static assets — headers on those add no security value
    // and this avoids re-running the nonce/CSP logic on every chunk request.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
