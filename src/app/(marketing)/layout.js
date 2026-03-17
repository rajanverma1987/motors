import Script from "next/script";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";

const GA_MEASUREMENT_ID = "G-RTSF7V6T7M";
const CLARITY_PROJECT_ID = "vwab4oi27x";

export default function MarketingLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
          `.trim(),
        }}
      />
      <Script
        id="microsoft-clarity"
        src={`https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`}
        strategy="afterInteractive"
      />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
