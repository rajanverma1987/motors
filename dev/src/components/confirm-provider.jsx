"use client";

import { createContext, useContext, useState, useCallback } from "react";
import ConfirmDialog from "@/components/ui/confirm-dialog";

const ConfirmContext = createContext(null);

const defaultState = {
  open: false,
  title: "Confirm",
  message: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  showCancel: true,
  variant: "warning",
  onConfirm: null,
  resolve: null,
};

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(defaultState);

  const confirm = useCallback(
    ({
      title = "Confirm",
      message = "",
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      variant = "warning",
      onConfirm,
    } = {}) => {
      return new Promise((resolve) => {
        setState({
          open: true,
          title,
          message,
          confirmLabel,
          cancelLabel,
          showCancel: true,
          variant,
          onConfirm,
          resolve,
        });
      });
    },
    []
  );

  /** Message box (same UI as confirm, OK only) — use instead of toast for Simple portal flows. */
  const alert = useCallback(
    ({
      title = "Notice",
      message = "",
      confirmLabel = "OK",
      variant = "primary",
    } = {}) => {
      return new Promise((resolve) => {
        setState({
          open: true,
          title,
          message,
          confirmLabel,
          cancelLabel: "Cancel",
          showCancel: false,
          variant,
          onConfirm: null,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    state.onConfirm?.();
    state.resolve?.(true);
    setState(defaultState);
  }, [state.onConfirm, state.resolve]);

  const handleCancel = useCallback(() => {
    // Alert (no cancel): Escape / backdrop dismisses as acknowledged.
    state.resolve?.(state.showCancel ? false : true);
    setState(defaultState);
  }, [state.resolve, state.showCancel]);

  const value = { confirm, alert };

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={state.open}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        showCancel={state.showCancel}
        variant={state.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}

export function useAlert() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useAlert must be used within ConfirmProvider");
  return ctx.alert;
}
