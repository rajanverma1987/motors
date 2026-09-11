"use client";

import { useId, useRef } from "react";
import { FiCamera, FiUpload } from "react-icons/fi";

const FIELD_BTN =
  "h-7 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-none border border-border bg-primary/[0.04] px-2 text-sm text-title outline-none hover:border-primary focus-within:border-primary focus-within:ring-1 focus-within:ring-primary dark:bg-primary/10";

const OUTLINE_BTN =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md border-[0.5px] border-border bg-transparent px-3 py-1 text-sm text-text transition-opacity hover:border-primary/20 hover:bg-card";

/**
 * Choose-file + Take-photo control for Simple attachment fields.
 * Take photo uses capture="environment" so tablets open the rear camera.
 *
 * @param {{
 *   onFiles: (files: File[]) => void,
 *   multiple?: boolean,
 *   disabled?: boolean,
 *   accept?: string,
 *   fileLabel?: string,
 *   cameraLabel?: string,
 *   showSelectedName?: boolean,
 *   selectedName?: string,
 *   variant?: "field" | "outline",
 *   className?: string,
 * }} props
 */
export default function SimpleAttachmentFilePicker({
  onFiles,
  multiple = false,
  disabled = false,
  accept = "*/*",
  fileLabel = "Choose file…",
  cameraLabel = "Take photo",
  showSelectedName = false,
  selectedName = "",
  variant = "field",
  className = "",
}) {
  const baseId = useId();
  const fileInputId = `${baseId}-file`;
  const cameraInputId = `${baseId}-camera`;
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const emitFiles = (list) => {
    if (!list?.length) return;
    const files = Array.from(list);
    onFiles?.(files);
  };

  const handleFileChange = (e) => {
    emitFiles(e.target.files);
    e.target.value = "";
  };

  const handleCameraChange = (e) => {
    emitFiles(e.target.files);
    e.target.value = "";
  };

  const btnClass = `${variant === "outline" ? OUTLINE_BTN : FIELD_BTN} ${
    disabled ? "pointer-events-none opacity-50" : ""
  }`;

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`.trim()}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          id={fileInputId}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          disabled={disabled}
          aria-label={fileLabel}
          onChange={handleFileChange}
        />
        <input
          ref={cameraRef}
          id={cameraInputId}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={disabled}
          aria-label={cameraLabel}
          onChange={handleCameraChange}
        />
        <label htmlFor={fileInputId} className={`${btnClass} !w-auto shrink-0`}>
          <FiUpload className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {fileLabel}
        </label>
        <label htmlFor={cameraInputId} className={`${btnClass} !w-auto shrink-0`} title="Open camera on tablet or phone">
          <FiCamera className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {cameraLabel}
        </label>
      </div>
      {showSelectedName ? (
        <p className="min-w-0 truncate text-xs text-secondary" title={selectedName || undefined}>
          {selectedName || "No file selected"}
        </p>
      ) : null}
    </div>
  );
}
