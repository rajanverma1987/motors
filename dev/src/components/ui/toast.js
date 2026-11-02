"use client";

import { useEffect } from "react";

const typeStyles = {
  success: "border-success/50 bg-card text-text",
  error: "border-danger/50 bg-card text-text",
  warning: "border-warning/50 bg-card text-text",
  info: "border-primary/50 bg-card text-text",
};

export function ToastItem({ id, message, type = "info", duration = 4000, onClose }) {
  useEffect(() => {
    if (duration > 0) {
      const t = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(t);
    }
  }, [id, duration, onClose]);

  return (
    <div
      role="alert"
      className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-lg ${typeStyles[type] ?? typeStyles.info}`}
    >
      <span className="text-sm text-title">{message}</span>
      <button
        type="button"
        onClick={() => onClose(id)}
        className="shrink-0 rounded p-1 hover:bg-bg focus:outline-none"
        aria-label="Close"
      >
        <svg className="h-4 w-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
