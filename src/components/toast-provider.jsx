"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { ToastItem } from "@/components/ui/toast";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const toast = useCallback(
    (message, type = "info", duration) => {
      return addToast(message, type, duration ?? 4000);
    },
    [addToast]
  );

  const value = {
    toast,
    success: (msg, duration) => addToast(msg, "success", duration ?? 4000),
    error: (msg, duration) => addToast(msg, "error", duration ?? 5000),
    warning: (msg, duration) => addToast(msg, "warning", duration ?? 4500),
    info: (msg, duration) => addToast(msg, "info", duration ?? 4000),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed right-4 top-4 z-[9999] flex max-h-[80vh] w-full max-w-sm flex-col gap-2 overflow-auto"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            id={t.id}
            message={t.message}
            type={t.type}
            duration={t.duration}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
