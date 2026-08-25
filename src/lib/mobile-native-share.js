/** Client helpers for native share on iOS / Android phones & tablets. */

/**
 * True on iPhone, iPad, iPod, or Android (phones and tablets).
 * Includes iPadOS desktop-UA mode (MacIntel + touch).
 */
export function isIosOrAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return true;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ may report as Macintosh
  if (navigator.platform === "MacIntel" && Number(navigator.maxTouchPoints || 0) > 1) return true;
  return false;
}

/**
 * Whether this browser can open the native share sheet with a file.
 */
export function canNativeShareFile() {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function") return false;
  return true;
}

/**
 * Share a PDF (or other) file via the OS share sheet.
 * @param {{ blob: Blob, filename: string, title?: string, text?: string }} opts
 */
export async function nativeShareFile({ blob, filename, title = "", text = "" }) {
  if (!blob) throw new Error("Nothing to share");
  const name = String(filename || "report.pdf").trim() || "report.pdf";
  const file = new File([blob], name, {
    type: blob.type || "application/pdf",
  });

  if (typeof navigator.canShare === "function") {
    try {
      if (!navigator.canShare({ files: [file] })) {
        throw new Error("Sharing files is not supported on this device.");
      }
    } catch (err) {
      // Some browsers throw from canShare for unsupported types
      if (err?.name === "TypeError") {
        throw new Error("Sharing files is not supported on this device.");
      }
      throw err;
    }
  }

  await navigator.share({
    files: [file],
    title: title || name,
    text: text || undefined,
  });
}
