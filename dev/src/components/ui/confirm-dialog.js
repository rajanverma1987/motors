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
  /** When false, clicking the backdrop does not close/cancel the dialog. */
  closeOnOutsideClick = false,
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
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[0.8px] dark:bg-black/65"
        onClick={closeOnOutsideClick ? onCancel : undefined}
      />
      <div className="relative w-full max-w-[33.6rem] rounded-lg border border-primary/45 bg-card p-6 shadow-xl shadow-primary/10 ring-1 ring-primary/20 dark:border-primary/50 dark:shadow-primary/15 dark:ring-primary/25">
        <h2 id="confirm-title" className="mb-2 text-lg font-semibold text-title">
          {title}
        </h2>
        {message ? (
          typeof message === "string" || typeof message === "number" ? (
            <p className="mb-6 whitespace-pre-wrap text-sm text-text">{message}</p>
          ) : (
            <div className="mb-6 text-sm text-text">{message}</div>
          )
        ) : (
          <div className="mb-6" />
        )}
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
