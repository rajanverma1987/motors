import { IQMOTORTRACK_MANIFEST_PATH } from "@/lib/iqmotortrack-pwa";

export const metadata = {
  title: { absolute: "IQMotorTrack" },
  description: "Motor maintenance and repair tracking for plants and facilities.",
  robots: { index: false, follow: false },
  manifest: IQMOTORTRACK_MANIFEST_PATH,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IQMotorTrack",
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

export default function TrackLayout({ children }) {
  return (
    <div className="min-h-[100dvh] bg-bg" data-track-app="true">
      {children}
    </div>
  );
}
