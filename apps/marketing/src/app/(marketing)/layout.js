import { Suspense } from "react";
import Script from "next/script";
import Navbar from "@/components/marketing/Navbar";
import PreferredSourceButton from "@/components/marketing/PreferredSourceButton";
import Footer from "@/components/marketing/Footer";
import ContextualAiWidget from "@/components/contextual-ai-widget";
import WebsiteAnalytics from "@/components/marketing/website-analytics";
import { SoftwareAppSchema } from "@/components/seo/schema-markup";

export default function MarketingLayout({ children }) {
  return (
    <div className="marketing-shell flex min-h-screen flex-col bg-bg pb-[env(safe-area-inset-bottom)]">
      <a href="#main-content" className="marketing-skip-link">
        Skip to main content
      </a>
      {/* Google Preferred Sources, one [google-add-preferred-source-btn] slot in the stripe below Navbar. */}
      <Script
        id="google-preferred-source"
        src="https://news.google.com/swg/js/v1/publisher.js"
        strategy="afterInteractive"
        preferred-sources-control="manual"
      />
      <SoftwareAppSchema />
      <Suspense fallback={null}>
        <WebsiteAnalytics />
      </Suspense>
      <Navbar />
      <PreferredSourceButton variant="stripe" />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        {children}
      </main>
      <Footer />
      <ContextualAiWidget />
    </div>
  );
}
