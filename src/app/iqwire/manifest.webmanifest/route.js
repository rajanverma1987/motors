import { NextResponse } from "next/server";
import { IQWIRECALCULATOR_APP_PATH } from "@/lib/iqwirecalculator-pwa";

export async function GET() {
  const startUrl = `${IQWIRECALCULATOR_APP_PATH}?source=pwa`;
  const manifest = {
    id: IQWIRECALCULATOR_APP_PATH,
    name: "IQWireCalculator",
    short_name: "IQWireCalc",
    description: "CM Best Match circular mils calculator for motor rewind shops.",
    start_url: startUrl,
    scope: IQWIRECALCULATOR_APP_PATH,
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    background_color: "#f3f1ef",
    theme_color: "#945c2e",
    lang: "en",
    dir: "ltr",
    categories: ["utilities", "productivity"],
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
