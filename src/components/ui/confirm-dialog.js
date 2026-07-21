"use client";

import { useEffect } from "react";
import Button from "./button";

export default function ConfirmDialog({
  open,
  title = "Confirm",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  /** When false, only the primary button is shown (message / alert box). */
  showCancel = true,
  variant = "warning",
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onCancel?.();
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmVariant = variant === "danger" ? "danger" : "primary";

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-[33.6rem] rounded-lg border border-border bg-card p-6 shadow-xl">
        <h2 id="confirm-title" className="mb-2 text-lg font-semibold text-title">
          {title}
        </h2>
        {message ? <p className="mb-6 text-sm text-text whitespace-pre-wrap">{message}</p> : <div className="mb-6" />}
        <div className="flex justify-end gap-3">
          {showCancel ? (
            <Button variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
          ) : null}
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
