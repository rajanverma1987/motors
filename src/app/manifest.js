/** @type {import('next').MetadataRoute.Manifest} */
export default function manifest() {
  return {
    id: "/?source=pwa",
    name: "IQMotorBase",
    short_name: "IQMotorBase",
    description:
      "Motor repair shop software — work orders, leads, inventory, and invoicing.",
    start_url: "/dashboards?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "any",
    background_color: "#f3f1ef",
    theme_color: "#945c2e",
    lang: "en",
    dir: "ltr",
    categories: ["business", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
