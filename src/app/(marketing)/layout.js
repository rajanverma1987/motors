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
        id="clarity-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
          `.trim(),
        }}
      />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
