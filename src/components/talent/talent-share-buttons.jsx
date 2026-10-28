"use client";

import { useMemo, useState } from "react";
import { FiCheck, FiCopy, FiLinkedin, FiShare2 } from "react-icons/fi";
import { FaFacebookF, FaXTwitter } from "react-icons/fa6";
import Button from "@/components/ui/button";

/**
 * Social share controls for a public talent profile URL.
 * @param {{ profileUrl: string, shareTitle?: string, shareText?: string, compact?: boolean }} props
 */
export default function TalentShareButtons({
  profileUrl,
  shareTitle = "My electric motor shop talent profile",
  shareText = "Check out my free electric motor shop talent profile on IQMotorBase.",
  compact = false,
}) {
  const [copied, setCopied] = useState(false);
  const url = String(profileUrl || "").trim();
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const links = useMemo(() => {
    if (!url) return [];
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(shareText);
    const encodedTitle = encodeURIComponent(shareTitle);
    return [
      {
        key: "linkedin",
        label: "LinkedIn",
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        icon: FiLinkedin,
      },
      {
        key: "facebook",
        label: "Facebook",
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        icon: FaFacebookF,
      },
      {
        key: "x",
        label: "X",
        href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
        icon: FaXTwitter,
      },
      {
        key: "mailto",
        label: "Email",
        href: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`,
        icon: FiShare2,
      },
    ];
  }, [url, shareText, shareTitle]);

  if (!url) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: shareTitle, text: shareText, url });
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="flex flex-wrap gap-2">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.key}
              href={item.href}
              target={item.key === "mailto" ? undefined : "_blank"}
              rel={item.key === "mailto" ? undefined : "noopener noreferrer"}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-title hover:border-primary/40 hover:bg-primary/5"
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              {item.label}
            </a>
          );
        })}
        <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
          {copied ? (
            <FiCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          ) : (
            <FiCopy className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
        {canNativeShare ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void nativeShare()}>
            <FiShare2 className="h-4 w-4 shrink-0" aria-hidden />
            Share
          </Button>
        ) : null}
      </div>
      {!compact ? (
        <p className="break-all text-xs text-secondary">
          Public link:{" "}
          <a href={url} className="font-medium text-primary hover:underline" target="_blank" rel="noreferrer">
            {url}
          </a>
        </p>
      ) : null}
    </div>
  );
}
