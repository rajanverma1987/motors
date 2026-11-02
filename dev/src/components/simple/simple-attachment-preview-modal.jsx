"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";

export function resolveAttachmentHref(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("blob:") || u.startsWith("data:")) {
    return u;
  }
  return u.startsWith("/") ? u : `/${u}`;
}

function extensionOf(value) {
  const s = String(value || "").trim().toLowerCase();
  if (!s) return "";
  const clean = s.split(/[?#]/)[0];
  const base = clean.includes("/") ? clean.slice(clean.lastIndexOf("/") + 1) : clean;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot + 1);
}

export function isImageAttachment(url, name = "", contentType = "") {
  const ct = String(contentType || "").toLowerCase();
  if (ct.startsWith("image/")) return true;
  const ext = extensionOf(url) || extensionOf(name);
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif"].includes(ext);
}

export function isPdfAttachment(url, name = "", contentType = "") {
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("pdf")) return true;
  const ext = extensionOf(url) || extensionOf(name);
  return ext === "pdf";
}

/** True when the file can be shown in SimpleAttachmentPreviewModal (image or PDF). */
export function isPreviewableAttachment(url, name = "", contentType = "") {
  return isImageAttachment(url, name, contentType) || isPdfAttachment(url, name, contentType);
}

/**
 * In-app preview for attachment View actions (images and PDFs).
 * PDFs are fetched into a blob URL with application/pdf so the browser iframe
 * renders even when the document display name has no .pdf extension.
 */
export default function SimpleAttachmentPreviewModal({
  open,
  onClose,
  url,
  name = "",
  contentType = "",
}) {
  const href = resolveAttachmentHref(url);
  const title = String(name || "").trim() || "Attachment";
  const knownImage = Boolean(href) && isImageAttachment(href, title, contentType);
  const knownPdf = Boolean(href) && isPdfAttachment(href, title, contentType);

  const [kind, setKind] = useState(
    knownImage ? "image" : knownPdf ? "pdf" : href ? "probe" : "none"
  );
  const [displaySrc, setDisplaySrc] = useState(knownImage ? href : "");
  const [loading, setLoading] = useState(Boolean(href) && (knownPdf || !knownImage));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !href) {
      setKind("none");
      setDisplaySrc("");
      setLoading(false);
      setError("");
      return undefined;
    }

    let cancelled = false;
    let objectUrl = "";

    const revoke = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = "";
      }
    };

    async function load() {
      setError("");
      if (knownImage && !knownPdf) {
        setKind("image");
        setDisplaySrc(href);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(href, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`Could not load file (${res.status})`);
        const blob = await res.blob();
        if (cancelled) return;

        const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
        const looksPdf =
          header.length >= 4 &&
          header[0] === 0x25 &&
          header[1] === 0x50 &&
          header[2] === 0x44 &&
          header[3] === 0x46;
        const mime = String(blob.type || contentType || "").toLowerCase();
        const asPdf =
          knownPdf || looksPdf || mime.includes("pdf") || isPdfAttachment(href, title, mime);
        const asImage =
          !asPdf &&
          (knownImage || mime.startsWith("image/") || isImageAttachment(href, title, mime));

        if (asPdf) {
          const typed =
            mime.includes("pdf") ? blob : new Blob([blob], { type: "application/pdf" });
          objectUrl = URL.createObjectURL(typed);
          if (cancelled) {
            revoke();
            return;
          }
          setKind("pdf");
          setDisplaySrc(objectUrl);
        } else if (asImage) {
          objectUrl = URL.createObjectURL(blob);
          if (cancelled) {
            revoke();
            return;
          }
          setKind("image");
          setDisplaySrc(objectUrl);
        } else {
          setKind("other");
          setDisplaySrc("");
        }
      } catch (err) {
        if (cancelled) return;
        if (knownPdf) {
          setKind("pdf");
          setDisplaySrc(href);
          setError("");
        } else if (knownImage) {
          setKind("image");
          setDisplaySrc(href);
          setError("");
        } else {
          setKind("other");
          setDisplaySrc("");
          setError(err?.message || "Could not load preview.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      revoke();
    };
  }, [open, href, knownImage, knownPdf, title, contentType]);

  const download = () => {
    if (!href) return;
    const a = document.createElement("a");
    a.href = href;
    a.download = title;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const openInNewTab = () => {
    if (!displaySrc && !href) return;
    window.open(displaySrc || href, "_blank", "noopener,noreferrer");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="5xl"
      width="min(960px, 96vw)"
      bodyClassName="!p-3 sm:!p-4"
      actions={
        href ? (
          <div className="flex items-center gap-2">
            {kind === "pdf" ? (
              <Button type="button" variant="outline" size="sm" onClick={openInNewTab}>
                Open in new tab
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={download}>
              Download
            </Button>
          </div>
        ) : null
      }
    >
      {!href ? (
        <p className="text-sm text-secondary">File is not available.</p>
      ) : loading ? (
        <div className="flex min-h-[12rem] items-center justify-center text-sm text-secondary">
          Loading preview…
        </div>
      ) : kind === "image" && displaySrc ? (
        <div className="flex max-h-[min(75vh,720px)] min-h-[12rem] items-center justify-center overflow-auto rounded-md bg-bg/80 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displaySrc}
            alt={title}
            className="max-h-[min(72vh,680px)] max-w-full object-contain"
          />
        </div>
      ) : kind === "pdf" && displaySrc ? (
        <div className="flex flex-col gap-2">
          <iframe
            title={title}
            src={`${displaySrc}#toolbar=1&navpanes=0&view=FitH`}
            className="h-[min(75vh,720px)] w-full rounded-md border border-border bg-card"
          />
          <p className="text-xs text-secondary">
            If the PDF is blank, use Open in new tab or Download.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 py-2">
          <p className="text-sm text-secondary">
            {error ||
              "Preview is not available for this file type. Download it to open on your device."}
          </p>
          <Button type="button" variant="primary" size="sm" onClick={download}>
            Download file
          </Button>
        </div>
      )}
    </Modal>
  );
}
