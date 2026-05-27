/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["pdfkit"],
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
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://*.clarity.ms ${contextualAi}`,
      `connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://www.clarity.ms https://*.clarity.ms https://c.bing.com https://*.bing.com ${contextualAi} wss://contextualaisystems.com`,
      `img-src 'self' data: blob: https://www.clarity.ms https://*.clarity.ms https://c.bing.com https://www.googletagmanager.com https://www.google-analytics.com ${contextualAi}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "frame-src 'self'",
      "media-src 'self' blob:",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
