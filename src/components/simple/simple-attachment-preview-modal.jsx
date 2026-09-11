"use client";

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

export function isImageAttachment(url, name = "") {
  const ext = extensionOf(url) || extensionOf(name);
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif"].includes(ext);
}

export function isPdfAttachment(url, name = "") {
  const ext = extensionOf(url) || extensionOf(name);
  return ext === "pdf";
}

/**
 * In-app preview for attachment View actions (photos in modal, PDFs in modal, others with download).
 */
export default function SimpleAttachmentPreviewModal({
  open,
  onClose,
  url,
  name = "",
}) {
  const href = resolveAttachmentHref(url);
  const title = String(name || "").trim() || "Attachment";
  const image = Boolean(href) && isImageAttachment(href, title);
  const pdf = Boolean(href) && isPdfAttachment(href, title);

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
          <Button type="button" variant="outline" size="sm" onClick={download}>
            Download
          </Button>
        ) : null
      }
    >
      {!href ? (
        <p className="text-sm text-secondary">File is not available.</p>
      ) : image ? (
        <div className="flex max-h-[min(75vh,720px)] min-h-[12rem] items-center justify-center overflow-auto rounded-md bg-bg/80 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={href}
            alt={title}
            className="max-h-[min(72vh,680px)] max-w-full object-contain"
          />
        </div>
      ) : pdf ? (
        <iframe
          title={title}
          src={href}
          className="h-[min(75vh,720px)] w-full rounded-md border border-border bg-card"
        />
      ) : (
        <div className="flex flex-col items-start gap-3 py-2">
          <p className="text-sm text-secondary">
            Preview is not available for this file type. Download it to open on your device.
          </p>
          <Button type="button" variant="primary" size="sm" onClick={download}>
            Download file
          </Button>
        </div>
      )}
    </Modal>
  );
}
