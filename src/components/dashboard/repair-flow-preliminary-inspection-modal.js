"use client";

import MotorInspectionModal from "@/components/dashboard/motor-inspection-modal";

/**
 * Pre-inspection modal — unified motor inspection fields (legacy prop names kept for callers).
 */
export default function RepairFlowPreliminaryInspectionModal({
  open,
  onClose,
  formId = "prelim-insp-form",
  saving = false,
  prelimFindings,
  onPrelimFieldChange,
  onSubmit,
  title = "Add pre-inspection",
}) {
  return (
    <MotorInspectionModal
      open={open}
      onClose={onClose}
      title={title}
      formId={formId}
      saving={saving}
      values={prelimFindings}
      onFieldChange={onPrelimFieldChange}
      onSubmit={onSubmit}
    />
  );
}
