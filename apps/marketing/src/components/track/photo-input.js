"use client";

import { useRef, useState } from "react";
import { FiCamera, FiTrash2, FiUpload } from "react-icons/fi";
import { useToast } from "@/components/toast-provider";
import { useTrackAuth } from "./auth-context";

/**
 * Camera-first photo picker for the plant PWA (§6.3 step 1).
 * `capture="environment"` opens the rear camera on iOS Safari and Android Chrome.
 */
export default function TrackPhotoInput({
  label,
  value,
  values,
  multiple = false,
  max = 4,
  onChange,
  profile = "image",
  help = "",
}) {
  const toast = useToast();
  const { token } = useTrackAuth();
  const cameraRef = useRef(null);
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const list = multiple ? (Array.isArray(values) ? values : []) : value ? [value] : [];

  const upload = async (files) => {
    const picked = Array.from(files || []).filter(Boolean);
    if (picked.length === 0) return;
    const room = multiple ? Math.max(0, max - list.length) : 1;
    if (room === 0) {
      toast.error(`You can attach up to ${max} files here.`);
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      for (const file of picked.slice(0, room)) body.append("files", file);
      body.append("profile", profile);
      const res = await fetch("/api/track/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      const urls = Array.isArray(data.urls) ? data.urls : [];
      if (urls.length === 0) throw new Error("Upload failed");
      onChange(multiple ? [...list, ...urls].slice(0, max) : urls[0]);
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAt = (index) => {
    if (!multiple) {
      onChange("");
      return;
    }
    onChange(list.filter((_, i) => i !== index));
  };

  const accept = profile === "document" ? "image/*,application/pdf" : "image/*";

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <span className="text-sm text-title">
          {label}
          {help ? <span className="ml-1 text-xs font-normal text-secondary">{help}</span> : null}
        </span>
      ) : null}

      {list.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {list.map((url, index) => (
            <li key={`${url}-${index}`} className="relative">
              {/\.pdf($|\?)/i.test(url) ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-bg text-[10px] font-semibold text-primary"
                >
                  PDF
                </a>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={url}
                  alt="Attachment"
                  className="h-20 w-20 rounded-lg border border-border object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label="Remove"
                className="absolute -right-1.5 -top-1.5 rounded-full bg-card p-1 text-danger shadow ring-1 ring-border hover:bg-danger/10"
              >
                <FiTrash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-semibold text-title disabled:opacity-60"
        >
          <FiCamera className="h-4 w-4 shrink-0" aria-hidden />
          {busy ? "Uploading…" : "Camera"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-semibold text-title disabled:opacity-60"
        >
          <FiUpload className="h-4 w-4 shrink-0" aria-hidden />
          Upload
        </button>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />
    </div>
  );
}
