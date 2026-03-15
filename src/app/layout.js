import { Inter, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";
import { ConfirmProvider } from "@/components/confirm-provider";
import { ModalStackProvider } from "@/components/modal-provider";
import { AuthProvider } from "@/contexts/auth-context";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://motors.example.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MotorsWinding.com – Motor Repair Center Software & Lead Generation",
    template: "%s | MotorsWinding.com",
  },
  description:
    "Center management, work orders, and lead generation for motor repair and rewinding businesses. Find local motor repair centers and manage your repair center with one platform.",
  keywords: [
    "motor repair center software",
    "motor rewinding center software",
    "electric motor repair management",
    "repair Job management software",
    "motor repair leads",
    "industrial motor repair",
  ],
  authors: [{ name: "MotorsWinding.com" }],
  creator: "MotorsWinding.com",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "MotorsWinding.com",
    title: "MotorsWinding.com – Motor Repair Center Software & Lead Generation",
    description:
      "Center management, work orders, and lead generation for motor repair and rewinding businesses.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MotorsWinding.com – Motor Repair Center Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MotorsWinding.com – Motor Repair Center Software & Lead Generation",
    description:
      "Center management, work orders, and lead generation for motor repair and rewinding businesses.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} font-sans bg-bg text-text antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ModalStackProvider>
                <ConfirmProvider>{children}</ConfirmProvider>
              </ModalStackProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
