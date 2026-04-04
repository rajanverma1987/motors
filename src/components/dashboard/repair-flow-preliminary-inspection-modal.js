"use client";

import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";
import RepairFlowPreliminaryFieldsGrid from "@/components/dashboard/repair-flow-preliminary-fields";

/**
 * Same pre-inspection entry as the intake job page: full-width modal, component select, preliminary fields grid, header actions.
 */
export default function RepairFlowPreliminaryInspectionModal({
  open,
  onClose,
  formId = "prelim-insp-form",
  saving = false,
  componentOptions = [],
  inspComponent,
  onInspComponentChange,
  prelimFindings,
  onPrelimFieldChange,
  onSubmit,
}) {
  function handleClose() {
    if (saving) return;
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add pre-inspection"
      width="min(1100px, 96vw)"
      showClose={!saving}
      actions={
        <>
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <Form id={formId} onSubmit={onSubmit} className="space-y-4">
        <div className="min-w-0 max-w-md">
          <Select
            label="Component"
            options={componentOptions}
            value={inspComponent}
            onChange={(e) => onInspComponentChange(e.target.value ?? "")}
            searchable={false}
            disabled={saving}
          />
        </div>
        <RepairFlowPreliminaryFieldsGrid
          component={inspComponent}
          values={prelimFindings}
          onFieldChange={onPrelimFieldChange}
          disabled={saving}
        />
      </Form>
    </Modal>
  );
}
