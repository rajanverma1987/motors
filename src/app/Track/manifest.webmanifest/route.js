import { NextResponse } from "next/server";
import { IQMOTORTRACK_APP_PATH } from "@/lib/iqmotortrack-pwa";

export async function GET() {
  const startUrl = `${IQMOTORTRACK_APP_PATH}?source=pwa`;
  const manifest = {
    id: IQMOTORTRACK_APP_PATH,
    name: "IQMotorTrack",
    short_name: "IQMotorTrack",
    description: "Motor maintenance and repair tracking for plants and facilities.",
    start_url: startUrl,
    scope: IQMOTORTRACK_APP_PATH,
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    background_color: "#f3f1ef",
    theme_color: "#945c2e",
    lang: "en",
    dir: "ltr",
    categories: ["business", "productivity"],
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
