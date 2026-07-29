"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { CLARITY_PROJECT_ID, isClarityExcludedPath, stopClarityCollect } from "@/lib/clarity-website";

/**
 * Loads Microsoft Clarity only on public website pages.
 * Skips login/register; stops collect when those paths are active.
 */
export default function WebsiteClarity() {
  const pathname = usePathname();
  const excluded = isClarityExcludedPath(pathname);

  useEffect(() => {
    if (excluded) stopClarityCollect();
  }, [excluded]);

  if (excluded) return null;

  return (
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
  );
}
