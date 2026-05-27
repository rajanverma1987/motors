"use client";

import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import MotorInspectionForm from "@/components/dashboard/motor-inspection-form";

/**
 * Pre-inspection or detailed inspection entry — same fields for both kinds.
 */
export default function MotorInspectionModal({
  open,
  onClose,
  title = "Inspection",
  subtitle = "",
  formId = "motor-insp-form",
  saving = false,
  values,
  onFieldChange,
  onSubmit,
  extraActions = null,
}) {
  function handleClose() {
    if (saving) return;
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      width="min(920px, 96vw)"
      showClose={!saving}
      headerClassName="flex-wrap"
      actions={
        <>
          {extraActions}
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save inspection"}
          </Button>
        </>
      }
    >
      {subtitle ? (
        <p className="-mt-1 mb-4 text-sm leading-relaxed text-secondary">{subtitle}</p>
      ) : null}
      <MotorInspectionForm
        formId={formId}
        values={values}
        onChange={onFieldChange}
        onSubmit={onSubmit}
        disabled={saving}
        namePrefix={formId}
      />
    </Modal>
  );
}
