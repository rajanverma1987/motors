/** UI labels for MotorRepairJob.phase */
export const REPAIR_FLOW_PHASE_LABELS = {
  intake: "Intake",
  pre_inspection: "Pre-inspection",
  preliminary_quote: "Preliminary quote",
  awaiting_preliminary_approval: "Awaiting preliminary approval",
  teardown_approved: "Approved for disassembly",
  disassembly_detailed: "Disassembly / detailed inspection",
  final_quote: "Final quote",
  awaiting_final_approval: "Awaiting final approval",
  work_execution: "Work execution",
  testing_qa: "Testing & QA",
  completed: "Completed",
  closed_returned: "Closed — returned",
  closed_scrap: "Closed — scrap",
};

/** Default execution stages after final repair approval (newFlow.md) */
export const DEFAULT_EXECUTION_STAGE_KEYS = [
  { key: "disassembly", label: "Disassembly" },
  { key: "cleaning_burnout", label: "Cleaning / burnout" },
  { key: "winding_repair", label: "Winding / repair" },
  { key: "machining", label: "Machining" },
  { key: "reassembly", label: "Reassembly" },
  { key: "testing", label: "Testing" },
];

export function executionStagesInitial() {
  return DEFAULT_EXECUTION_STAGE_KEYS.map(({ key }) => ({
    key,
    status: "pending",
    notes: "",
    updatedAt: new Date(),
  }));
}

/**
 * Suggested inspection components from motor type (AC vs DC).
 * @param {string} motorType
 * @returns {Array<{ value: string, label: string }>}
 */
export function inspectionComponentsForMotorType(motorType) {
  const t = String(motorType || "").toUpperCase();
  if (t === "DC") {
    return [
      { value: "field_frame", label: "Field frame" },
      { value: "armature", label: "Armature" },
    ];
  }
  return [
    { value: "stator", label: "Stator" },
    { value: "rotor", label: "Rotor" },
  ];
}

export function phaseBadgeVariant(phase) {
  if (phase === "completed") return "success";
  if (phase === "closed_returned" || phase === "closed_scrap") return "danger";
  if (phase === "awaiting_preliminary_approval" || phase === "awaiting_final_approval") return "warning";
  return "default";
}
