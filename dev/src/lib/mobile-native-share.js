/** Client helpers for native share on phones, tablets, and installed PWAs. */

/**
 * Installed PWA / home-screen app (standalone or minimal-ui).
 */
export function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  } catch {
    /* ignore */
  }
  // iOS Safari “Add to Home Screen”
  if (window.navigator?.standalone === true) return true;
  return false;
}

/**
 * True on iPhone, iPad, iPod, Android, or touch Macs (iPadOS desktop UA).
 */
export function isIosOrAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return true;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ often reports as Macintosh
  const touchPoints = Number(navigator.maxTouchPoints || 0);
  if (/Macintosh|MacIntel/i.test(ua) && touchPoints > 1) return true;
  if (navigator.platform === "MacIntel" && touchPoints > 1) return true;
  return false;
}

function isTouchDevice() {
  if (typeof navigator === "undefined") return false;
  if (Number(navigator.maxTouchPoints || 0) > 0) return true;
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

/**
 * Whether the OS share sheet API exists.
 */
export function canNativeShareFile() {
  if (typeof navigator === "undefined") return false;
  return typeof navigator.share === "function";
}

/**
 * Show Share for iOS/Android (phone/tablet) and for installed touch PWAs
 * that expose navigator.share.
 */
export function shouldShowReportShareButton() {
  if (!canNativeShareFile()) return false;
  if (isIosOrAndroidDevice()) return true;
  // Chromium/Android/iOS PWAs sometimes need standalone detection
  if (isStandalonePwa() && isTouchDevice()) return true;
  return false;
}

/**
 * Share a PDF (or other) file via the OS share sheet.
 * @param {{ blob: Blob, filename: string, title?: string, text?: string }} opts
 */
export async function nativeShareFile({ blob, filename, title = "", text = "" }) {
  if (!blob) throw new Error("Nothing to share");
  if (typeof navigator.share !== "function") {
    throw new Error("Sharing is not supported on this device.");
  }

  const name = String(filename || "report.pdf").trim() || "report.pdf";
  const type = blob.type || "application/pdf";
  const file = new File([blob], name, { type });

  const payloadWithFiles = {
    files: [file],
    title: title || name,
    text: text || undefined,
  };

  if (typeof navigator.canShare === "function") {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share(payloadWithFiles);
        return;
      }
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      // Fall through to URL/text share when file share is blocked
    }
  } else {
    try {
      await navigator.share(payloadWithFiles);
      return;
    } catch (err) {
      if (err?.name === "AbortError") throw err;
    }
  }

  // Fallback: share title/text only (some PWAs allow share but not files)
  await navigator.share({
    title: title || name,
    text: text || `Report: ${name}`,
  });
}
