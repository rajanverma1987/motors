import { Inter, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";
import { ConfirmProvider } from "@/components/confirm-provider";
import { ModalStackProvider } from "@/components/modal-provider";
import { AuthProvider } from "@/contexts/auth-context";
import PwaRegister from "@/components/pwa-register";
import { getPublicSiteUrl } from "@/lib/public-site-url";
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

const siteUrl = getPublicSiteUrl();

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f1ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1f1c1a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "3PhaseFlow",
  title: {
    default: "Shop portal | 3PhaseFlow",
    template: "%s | 3PhaseFlow",
  },
  description:
    "Sign in to your 3PhaseFlow motor repair shop portal.",
  keywords: [
    "motor repair center software",
    "motor rewinding center software",
    "electric motor repair management",
    "repair Job management software",
    "motor repair leads",
    "industrial motor repair",
  ],
  authors: [{ name: "3PhaseFlow.com" }],
  creator: "3PhaseFlow.com",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "3PhaseFlow",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "3PhaseFlow",
    title: "Shop portal | 3PhaseFlow",
    description: "Sign in to your 3PhaseFlow motor repair shop portal.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "3PhaseFlow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop portal | 3PhaseFlow",
    description: "Sign in to your 3PhaseFlow motor repair shop portal.",
    images: ["/og-image.png"],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
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
                <ConfirmProvider>
                  <PwaRegister />
                  {children}
                </ConfirmProvider>
              </ModalStackProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
