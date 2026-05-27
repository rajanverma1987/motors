"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import MotorAssetReadonlyDetail from "@/components/motor-asset-readonly-detail";

/**
 * Opens a motor record in a modal without leaving the current page (e.g. Customer view).
 */
export default function MotorQuickViewModal({
  open,
  motorId,
  customerName = "",
  onClose,
  zIndex = 125,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [motor, setMotor] = useState(null);

  useEffect(() => {
    if (!open) {
      setMotor(null);
      setLoading(false);
      return;
    }
    if (!motorId) return;
    let cancelled = false;
    setLoading(true);
    setMotor(null);
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/motors/${motorId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Failed to load motor");
        setMotor(data);
      } catch (e) {
        if (!cancelled) {
          toast.error(e.message || "Failed to load motor");
          onClose?.();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, motorId, toast, onClose]);

  const title = motor?.serialNumber
    ? `Motor ${motor.serialNumber}`
    : motor?.manufacturer || motor?.model
      ? `Motor ${[motor.manufacturer, motor.model].filter(Boolean).join(" ")}`
      : "Motor details";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="min(1200px, 96vw)"
      zIndex={zIndex}
      actions={
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      {loading ? (
        <p className="py-8 text-center text-secondary">Loading…</p>
      ) : motor ? (
        <MotorAssetReadonlyDetail motor={motor} customerName={customerName || undefined} />
      ) : null}
    </Modal>
  );
}
