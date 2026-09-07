import { IQWIRECALCULATOR_MANIFEST_PATH } from "@/lib/iqwirecalculator-pwa";

export const metadata = {
  title: { absolute: "IQWireCalculator" },
  description: "CM Best Match circular mils calculator for motor rewind shops.",
  robots: { index: false, follow: false },
  manifest: IQWIRECALCULATOR_MANIFEST_PATH,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IQWireCalculator",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#945c2e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function IqwireLayout({ children }) {
  return (
    <div className="min-h-[100dvh] bg-bg" data-iqwire-app="true">
      {children}
    </div>
  );
}
