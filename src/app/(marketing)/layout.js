import Script from "next/script";
import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import ContextualAiWidget from "@/components/contextual-ai-widget";
import WebsiteClarity from "@/components/marketing/website-clarity";
import { SoftwareAppSchema } from "@/components/seo/schema-markup";

const GA_MEASUREMENT_ID = "G-RTSF7V6T7M";

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
      <SoftwareAppSchema />
      <WebsiteClarity />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ContextualAiWidget />
    </div>
  );
}
