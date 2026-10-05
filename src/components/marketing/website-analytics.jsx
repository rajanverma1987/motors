"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import {
  CLARITY_PROJECT_ID,
  GA_MEASUREMENT_ID,
  enableGoogleAnalytics,
  isClarityExcludedPath,
  isPrivateAppPath,
  isSelfReferrer,
  sendGaPageView,
  stopClarityCollect,
  stopWebsiteAnalytics,
} from "@/lib/website-analytics";

/**
 * Loads GA4 + Clarity on public marketing pages only.
 * - SPA route changes send page_view (fixes broken attribution under App Router)
 * - Same-domain / legacy-domain referrers use ignore_referrer (stops self-referral sessions)
 * - Dashboard / admin never collect (disable + stop)
 */
export default function WebsiteAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPageKey = useRef("");
  const privatePath = isPrivateAppPath(pathname);
  const clarityExcluded = isClarityExcludedPath(pathname);

  useEffect(() => {
    if (privatePath) {
      stopWebsiteAnalytics();
      return;
    }
    enableGoogleAnalytics();
  }, [privatePath]);

  useEffect(() => {
    if (clarityExcluded) stopClarityCollect();
  }, [clarityExcluded]);

  useEffect(() => {
    if (privatePath) return;
    if (typeof window === "undefined") return;

    const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";
    const pageKey = `${pathname || "/"}${search}`;
    if (pageKey === lastPageKey.current) return;

    const ignoreReferrer = isSelfReferrer(document.referrer);
    const send = () => {
      if (pageKey === lastPageKey.current) return;
      sendGaPageView(pathname || "/", { ignoreReferrer });
      lastPageKey.current = pageKey;
    };

    if (typeof window.gtag === "function") {
      send();
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (cancelled) return;
      if (typeof window.gtag === "function") {
        window.clearInterval(timer);
        send();
        return;
      }
      if (attempts >= 40) window.clearInterval(timer);
    }, 50);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pathname, searchParams, privatePath]);

  if (privatePath) return null;

  return (
    <>
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
window.gtag = gtag;
gtag('js', new Date());
(function(){
  var ignore = false;
  try {
    var ref = document.referrer || "";
    if (ref) {
      var host = new URL(ref).hostname.toLowerCase().replace(/^www\\./, "");
      ignore = host === "iqmotorbase.com" || host.endsWith(".iqmotorbase.com")
        || host === "motorswinding.com" || host.endsWith(".motorswinding.com");
    }
  } catch (e) {}
  var cfg = { send_page_view: false, cookie_flags: "SameSite=Lax;Secure" };
  if (ignore) cfg.ignore_referrer = true;
  gtag("config", "${GA_MEASUREMENT_ID}", cfg);
})();
          `.trim(),
        }}
      />
      {!clarityExcluded ? (
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
      ) : null}
    </>
  );
}
