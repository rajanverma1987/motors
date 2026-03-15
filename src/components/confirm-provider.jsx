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
          variant,
          onConfirm,
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
    state.resolve?.(false);
    setState(defaultState);
  }, [state.resolve]);

  const value = { confirm };

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={state.open}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
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
