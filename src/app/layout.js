import { Inter, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";
import { ConfirmProvider } from "@/components/confirm-provider";
import { ModalStackProvider } from "@/components/modal-provider";
import { AuthProvider } from "@/contexts/auth-context";
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

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Motor Repair Shop Software — Work Orders, Leads & Inventory | IQMotorBase",
    template: "%s | IQMotorBase",
  },
  description:
    "Manage work orders, leads, inventory, and invoicing for your electric motor repair shop — all in one platform. Book a free demo today.",
  keywords: [
    "motor repair center software",
    "motor rewinding center software",
    "electric motor repair management",
    "repair Job management software",
    "motor repair leads",
    "industrial motor repair",
  ],
  authors: [{ name: "IQMotorBase.com" }],
  creator: "IQMotorBase.com",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "IQMotorBase.com",
    title: "Motor Repair Shop Software — Work Orders, Leads & Inventory | IQMotorBase",
    description:
      "Manage work orders, leads, inventory, and invoicing for your electric motor repair shop — all in one platform. Book a free demo today.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "IQMotorBase.com – Motor Repair Center Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Motor Repair Shop Software — Work Orders, Leads & Inventory | IQMotorBase",
    description:
      "Manage work orders, leads, inventory, and invoicing for your electric motor repair shop — all in one platform. Book a free demo today.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
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
                <ConfirmProvider>{children}</ConfirmProvider>
              </ModalStackProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
