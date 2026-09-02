/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow tablets / phones on LAN to load /_next assets during `next dev`.
  // Without this, JS never hydrates and login falls back to a plain GET form.
  // Wildcards cover typical home/office LAN IPs so you do not re-edit per Wi‑Fi.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "172.20.*.*",
    "172.21.*.*",
    "172.22.*.*",
    "172.23.*.*",
    "172.24.*.*",
    "172.25.*.*",
    "172.26.*.*",
    "172.27.*.*",
    "172.28.*.*",
    "172.29.*.*",
    "172.30.*.*",
    "172.31.*.*",
    ...(process.env.ALLOWED_DEV_ORIGINS
      ? process.env.ALLOWED_DEV_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
      : []),
  ],
  serverExternalPackages: ["pdfkit", "exceljs"],
  /** Runtime uploads live under public/uploads — never bundle them into server traces. */
  outputFileTracingExcludes: {
    "*": ["./public/uploads/**/*"],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "(?:www\\.)?motorswinding\\.com" }],
        destination: "https://IQMotorBase.com/:path*",
        permanent: true,
      },
      { source: "/motor-repair-near-me", destination: "/electric-motor-repair-near-me", permanent: true },
      { source: "/motor-repair-software", destination: "/motor-repair-shop-management-software", permanent: true },
      { source: "/motor-repair-shops", destination: "/electric-motor-repair-shops-listings", permanent: true },
      {
        source: "/electric-motor-reapir-shops-listings",
        destination: "/electric-motor-repair-shops-listings",
        permanent: true,
      },
      {
        source: "/electric-motor-reapir-shops-listings/:path*",
        destination: "/electric-motor-repair-shops-listings/:path*",
        permanent: true,
      },
      {
        source: "/electric-motor-reapir-near-me",
        destination: "/electric-motor-repair-near-me",
        permanent: true,
      },
      {
        source: "/electric-motor-reapir-near-me/:path*",
        destination: "/electric-motor-repair-near-me/:path*",
        permanent: true,
      },
      { source: "/emergency-motor-repair", destination: "/emergency-motor-repair-what-to-do", permanent: true },
      { source: "/dashboard/quotes", destination: "/dashboard/rfq", permanent: true },
      { source: "/dashboard/quotes/:path*", destination: "/dashboard/rfq/:path*", permanent: true },
      {
        source: "/webapps/billing/:path*",
        destination: `${(process.env.PAYPAL_MODE || "sandbox").toLowerCase() === "live" ? "https://www.paypal.com" : "https://www.sandbox.paypal.com"}/webapps/billing/:path*`,
        permanent: false,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 192, 256, 384, 512],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    // CSP: allow Microsoft Clarity (https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-csp),
    // Google Analytics, and required Next.js / app sources. If you add stricter rules elsewhere, ensure Clarity stays allowed.
    const contextualAi = "https://contextualaisystems.com";
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://*.clarity.ms https://www.paypal.com https://www.sandbox.paypal.com https://www.paypalobjects.com ${contextualAi}`,
      `connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://www.clarity.ms https://*.clarity.ms https://c.bing.com https://*.bing.com https://www.paypal.com https://www.sandbox.paypal.com https://*.paypal.com https://*.paypalobjects.com ${contextualAi} wss://contextualaisystems.com`,
      `img-src 'self' data: blob: https://www.clarity.ms https://*.clarity.ms https://c.bing.com https://www.googletagmanager.com https://www.google-analytics.com https://www.paypalobjects.com https://www.paypal.com ${contextualAi}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "frame-src 'self' https://www.paypal.com https://www.sandbox.paypal.com https://*.paypal.com https://www.paypalobjects.com https://*.paypalobjects.com",
      "child-src 'self' https://www.paypal.com https://www.sandbox.paypal.com https://*.paypal.com https://www.paypalobjects.com",
      "form-action 'self' https://www.paypal.com https://www.sandbox.paypal.com https://*.paypal.com",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join("; ");

    return [
      {
        source: "/uploads/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/dashboards",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/dashboards/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/dashboard",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/dashboard/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/login",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            // geolocation=(self): Time Clock + shop geofence "Use my location" need GPS.
            // Empty geolocation=() blocks the API with PERMISSION_DENIED and no browser prompt.
            value: "camera=(self), microphone=(), geolocation=(self), payment=(self)",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
