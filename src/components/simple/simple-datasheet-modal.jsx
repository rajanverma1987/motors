"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import SimpleSelect from "@/components/simple/simple-select";
import DocumentPrintOffscreenPortal from "@/components/dashboard/document-print-offscreen-portal";
import SimpleDatasheetPrintSheet from "@/components/simple/simple-datasheet-print-sheet";
import SimpleServiceProposalAttachmentsModal from "@/components/simple/simple-service-proposal-attachments-modal";
import SimpleDiagramModal from "@/components/simple/simple-diagram-modal";
import SimpleAcDisassemblyFields from "@/components/simple/simple-ac-disassembly-fields";
import SimpleAcAssemblyFields from "@/components/simple/simple-ac-assembly-fields";
import DatasheetFieldGrid, {
  DATASHEET_FIELD_INPUT,
} from "@/components/simple/simple-datasheet-field-grid";
import { useAlert } from "@/components/confirm-provider";
import {
  AC_DATASHEET_FIELD_COLUMNS,
  AC_DATASHEET_SECTIONS,
  AC_DATASHEET_TAB_ASSEMBLY,
  AC_DATASHEET_TAB_DISASSEMBLY,
  DC_ARMATURE_FIELD_COLUMNS,
  DC_DATASHEET_SECTIONS,
  DC_DATASHEET_TAB_ARMATURE,
  DC_FIELD_FRAME_FIELD_COLUMNS,
  acDatasheetVisibleTabs,
  createEmptyAcDatasheet,
  createEmptyDcDatasheet,
  dcDatasheetVisibleTabs,
  normalizeAcDatasheet,
  normalizeDcDatasheet,
} from "@/lib/simple-datasheet-form";
import { RECORD_TYPE_RFQ, recordTypeJobNumberLabel } from "@/lib/simple-service-proposal-form";

const FORM_ID = "simple-datasheet-form";
const FIELD_INPUT = DATASHEET_FIELD_INPUT;
const FIELD_TEXTAREA =
  "w-full min-w-0 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const TOOLBAR_BTN = "h-7 shrink-0 rounded-none px-2.5 text-xs font-semibold";
const TAB_BTN =
  "h-7 shrink-0 rounded-none px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

function FieldRow({ label, labelWidth = "6.5rem", children, className = "" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <label className={FIELD_LABEL} style={{ width: labelWidth }}>
        {label}
      </label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function NotesPanel({ label, value, onChange, ariaLabel }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-bold text-title">{label}</span>
      <textarea
        rows={8}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD_TEXTAREA}
        aria-label={ariaLabel || label}
      />
    </div>
  );
}

/**
 * AC / DC datasheet modal for Simple service proposals (layout from documents/AC.png, DC.png, Armature.png).
 */
export default function SimpleDatasheetModal({
  open,
  onClose,
  onSave,
  motorType = "AC",
  initialDatasheet = null,
  technicianOptions = [],
  printContext = null,
  recordId = null,
  attachments = [],
  onAttached,
  jobDiagrams = [],
  onDiagramsChange,
  /** Service Proposal job Status options + value (Disassembly Status section). */
  jobStatusOptions = [],
  jobStatus = "",
  onJobStatusChange,
  recordType = RECORD_TYPE_RFQ,
}) {
  const alert = useAlert();
  const isDc = String(motorType || "AC").toUpperCase() === "DC";
  const [form, setForm] = useState(() =>
    isDc ? createEmptyDcDatasheet() : createEmptyAcDatasheet()
  );
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [diagramOpen, setDiagramOpen] = useState(false);
  const wasOpenRef = useRef(false);

  const jobNumberLabel = useMemo(() => recordTypeJobNumberLabel(recordType), [recordType]);

  const canAttach = Boolean(String(recordId || "").trim());

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const next = isDc
        ? normalizeDcDatasheet(initialDatasheet || {})
        : normalizeAcDatasheet(initialDatasheet || {});
      if (!isDc) {
        const asm = next.assembly && typeof next.assembly === "object" ? next.assembly : {};
        if (!String(asm.date || "").trim()) asm.date = String(next.date || "").slice(0, 10);
        if (!String(asm.technicianName || "").trim()) {
          asm.technicianName = String(next.technician || "").trim();
        }
        next.assembly = asm;
      }
      setForm(next);
      setPrinting(false);
      setAttachmentsOpen(false);
      setDiagramOpen(false);
    }
    wasOpenRef.current = open;
  }, [open, isDc, initialDatasheet]);

  const patch = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const patchNested = (blockKey, fieldKey, value) => {
    setForm((f) => ({
      ...f,
      [blockKey]: {
        ...(f[blockKey] && typeof f[blockKey] === "object" ? f[blockKey] : {}),
        [fieldKey]: value,
      },
    }));
  };

  const handleDcSectionChange = (nextSection) => {
    setForm((f) => {
      const visible = dcDatasheetVisibleTabs(nextSection);
      const activeTab = visible.includes(f.activeTab) ? f.activeTab : visible[0];
      return { ...f, section: nextSection, activeTab };
    });
  };

  const handleAcSectionChange = (nextSection) => {
    setForm((f) => {
      const visible = acDatasheetVisibleTabs(nextSection);
      const activeTab = visible.includes(f.activeTab) ? f.activeTab : visible[0];
      return { ...f, section: nextSection, activeTab };
    });
  };

  const handlePrint = () => {
    setPrinting(true);
  };

  const handlePrintDone = () => {
    setPrinting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave?.(isDc ? normalizeDcDatasheet(form) : normalizeAcDatasheet(form));
      onClose?.();
    } catch (err) {
      await alert({
        title: "Error",
        message: err?.message || "Failed to save datasheet",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const techOptions = useMemo(() => {
    const opts = Array.isArray(technicianOptions) ? technicianOptions : [];
    const value = String(form.technician || "").trim();
    if (value && !opts.some((o) => String(o.value) === value || String(o.label) === value)) {
      return [{ value, label: value }, ...opts];
    }
    return opts;
  }, [technicianOptions, form.technician]);

  const technicianLabel = useMemo(() => {
    const value = String(form.technician || "").trim();
    if (!value) return "";
    const match = techOptions.find((o) => String(o.value) === value || String(o.label) === value);
    return match?.label || value;
  }, [techOptions, form.technician]);

  const resolvedPrintContext = useMemo(() => {
    const ctx = printContext && typeof printContext === "object" ? printContext : {};
    const jobStatusValue = String(ctx.jobStatus || jobStatus || "").trim();
    const jobStatusHit = (Array.isArray(jobStatusOptions) ? jobStatusOptions : []).find(
      (o) => String(o.value || "").trim().toLowerCase() === jobStatusValue.toLowerCase()
    );
    return {
      customerName: String(ctx.customerName || ctx.companyName || form.company || "").trim(),
      contactName: String(ctx.contactName || "").trim(),
      companyName: String(ctx.companyName || form.company || ctx.customerName || "").trim(),
      customerPhone: String(ctx.customerPhone || "").trim(),
      customerEmail: String(ctx.customerEmail || "").trim(),
      customerPo: String(ctx.customerPo || "").trim(),
      documentNumber: String(ctx.documentNumber || form.jobNumber || "").trim(),
      documentLabel: String(ctx.documentLabel || "RFQ#").trim() || "RFQ#",
      jobStatus: jobStatusValue,
      jobStatusLabel: jobStatusHit?.label || jobStatusValue,
    };
  }, [printContext, form.company, form.jobNumber, jobStatus, jobStatusOptions]);

  const printDatasheet = useMemo(
    () => (isDc ? normalizeDcDatasheet(form) : normalizeAcDatasheet(form)),
    [isDc, form]
  );

  const dcVisibleTabs = useMemo(
    () => (isDc ? dcDatasheetVisibleTabs(form.section) : []),
    [isDc, form.section]
  );
  const acVisibleTabs = useMemo(
    () => (!isDc ? acDatasheetVisibleTabs(form.section) : []),
    [isDc, form.section]
  );

  const activeDcTab = dcVisibleTabs.includes(form.activeTab) ? form.activeTab : dcVisibleTabs[0];
  const isArmatureTab = activeDcTab === DC_DATASHEET_TAB_ARMATURE;
  const dcBlockKey = isArmatureTab ? "armature" : "fieldFrame";
  const dcColumns = isArmatureTab ? DC_ARMATURE_FIELD_COLUMNS : DC_FIELD_FRAME_FIELD_COLUMNS;
  const dcBlock = form[dcBlockKey] && typeof form[dcBlockKey] === "object" ? form[dcBlockKey] : {};

  const showAcTabStripe = !isDc && form.section === "Complete Motor";
  const activeAcTab = acVisibleTabs.includes(form.activeTab) ? form.activeTab : acVisibleTabs[0];
  const acBlockKey =
    activeAcTab === AC_DATASHEET_TAB_DISASSEMBLY
      ? "disassembly"
      : activeAcTab === AC_DATASHEET_TAB_ASSEMBLY
        ? "assembly"
        : "dataSheet";
  const acBlock = form[acBlockKey] && typeof form[acBlockKey] === "object" ? form[acBlockKey] : {};

  const headerActions = (
    <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={saving || printing}>
      {saving ? "Saving…" : "Save"}
    </Button>
  );

  return (
    <>
    <Modal
      open={open && !printing}
      onClose={() => !saving && !printing && onClose?.()}
      title={isDc ? "Add/Edit DC Fields" : "Add/Edit AC Fields"}
      size="6xl"
      width="min(1100px, 96vw)"
      height="min(90vh, 880px)"
      showClose={!saving && !printing}
      closeOnOutsideClick={false}
      actions={headerActions}
    >
      <Form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {isDc ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1" role="radiogroup" aria-label="DC section">
                {DC_DATASHEET_SECTIONS.map((opt) => (
                  <label key={opt} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-title">
                    <input
                      type="radio"
                      name="dcSection"
                      value={opt}
                      checked={form.section === opt}
                      onChange={() => handleDcSectionChange(opt)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1" role="radiogroup" aria-label="AC section">
                {AC_DATASHEET_SECTIONS.map((opt) => (
                  <label key={opt} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-title">
                    <input
                      type="radio"
                      name="acSection"
                      value={opt}
                      checked={form.section === opt}
                      onChange={() => handleAcSectionChange(opt)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Button type="button" variant="primary" size="sm" className={TOOLBAR_BTN} onClick={handlePrint}>
              Print
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className={TOOLBAR_BTN}
              disabled={!canAttach || saving || printing}
              title={canAttach ? "Add attachments" : "Save the record before adding attachments"}
              onClick={() => setAttachmentsOpen(true)}
            >
              Attachments
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className={TOOLBAR_BTN}
              disabled={!canAttach || saving || printing}
              title={
                canAttach
                  ? Array.isArray(jobDiagrams) && jobDiagrams.length
                    ? "View or add job diagrams"
                    : "Draw or view diagrams"
                  : "Save the record before drawing a diagram"
              }
              onClick={() => setDiagramOpen(true)}
            >
              {Array.isArray(jobDiagrams) && jobDiagrams.length
                ? `Diagrams (${jobDiagrams.length})`
                : "Draw/View Diagram"}
            </Button>
          </div>
        </div>

        <div
          className="flex flex-col gap-2 border-b-2 border-primary/40 pb-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-5 sm:gap-y-2"
          aria-label="Shared job fields"
        >
          <div className="min-w-0 flex-1 basis-[10rem]">
            <div className="mb-1 text-sm font-bold text-title">Date</div>
            <input
              type="date"
              value={String(form.date || "").slice(0, 10)}
              className={`${FIELD_INPUT} !border-0 !bg-transparent !px-0 !text-sm !font-semibold !text-title`}
              aria-label="Date"
              disabled
              readOnly
            />
          </div>
          <div className="hidden h-8 w-px shrink-0 bg-border sm:block" aria-hidden />
          <div className="min-w-0 flex-[1.2] basis-[12rem]">
            <div className="mb-1 text-sm font-bold text-title">Technician</div>
            <SimpleSelect
              options={techOptions}
              value={form.technician}
              onChange={(e) => {
                const next = e.target.value;
                setForm((f) => {
                  const updated = { ...f, technician: next };
                  if (!isDc && f.assembly && typeof f.assembly === "object") {
                    updated.assembly = { ...f.assembly, technicianName: next };
                  }
                  return updated;
                });
              }}
              placeholder="Select…"
              searchable
              aria-label="Technician"
            />
          </div>
          <div className="hidden h-8 w-px shrink-0 bg-border sm:block" aria-hidden />
          <div className="min-w-0 flex-1 basis-[9rem]">
            <div className="mb-1 text-sm font-bold text-title">{jobNumberLabel}</div>
            <input
              type="text"
              value={form.jobNumber}
              className={`${FIELD_INPUT} !border-0 !bg-transparent !px-0 !text-sm !font-semibold !text-title`}
              aria-label={jobNumberLabel}
              disabled
              readOnly
            />
          </div>
          <div className="hidden h-8 w-px shrink-0 bg-border sm:block" aria-hidden />
          <div className="min-w-0 flex-[1.4] basis-[12rem]">
            <div className="mb-1 text-sm font-bold text-title">Company</div>
            <input
              type="text"
              value={form.company}
              className={`${FIELD_INPUT} !border-0 !bg-transparent !px-0 !text-sm !font-semibold !text-title`}
              aria-label="Company"
              disabled
              readOnly
            />
          </div>
        </div>

        {isDc && form.section === "Complete Motor" ? (
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="DC datasheet tabs">
            {dcVisibleTabs.map((tab) => {
              const active = tab === activeDcTab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`${TAB_BTN} ${
                    active
                      ? "bg-primary text-white"
                      : "border border-border bg-primary/[0.06] text-title hover:bg-primary/15 dark:bg-primary/15"
                  }`}
                  onClick={() => patch("activeTab", tab)}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        ) : null}

        {showAcTabStripe ? (
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="AC datasheet tabs">
            {acVisibleTabs.map((tab) => {
              const active = tab === activeAcTab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`${TAB_BTN} ${
                    active
                      ? "bg-primary text-white"
                      : "border border-border bg-primary/[0.06] text-title hover:bg-primary/15 dark:bg-primary/15"
                  }`}
                  onClick={() => patch("activeTab", tab)}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        ) : null}

        {isDc ? (
          <>
            <DatasheetFieldGrid
              columns={dcColumns}
              values={dcBlock}
              onFieldChange={(key, value) => patchNested(dcBlockKey, key, value)}
            />
            <NotesPanel
              label="Notes:"
              value={dcBlock.notes ?? ""}
              onChange={(v) => patchNested(dcBlockKey, "notes", v)}
              ariaLabel={`${activeDcTab || "DC"} notes`}
            />
          </>
        ) : acBlockKey === "dataSheet" ? (
          <>
            <DatasheetFieldGrid
              columns={AC_DATASHEET_FIELD_COLUMNS}
              values={acBlock}
              onFieldChange={(key, value) => patchNested("dataSheet", key, value)}
              labelWidth="10.5rem"
            />
            <NotesPanel
              label="Notes:"
              value={acBlock.notes ?? ""}
              onChange={(v) => patchNested("dataSheet", "notes", v)}
              ariaLabel="DataSheet notes"
            />
          </>
        ) : acBlockKey === "disassembly" ? (
          <SimpleAcDisassemblyFields
            values={acBlock}
            onChange={(key, value) => patchNested("disassembly", key, value)}
            statusOptions={jobStatusOptions}
            statusValue={jobStatus}
            onStatusChange={onJobStatusChange}
          />
        ) : (
          <SimpleAcAssemblyFields
            values={acBlock}
            onChange={(key, value) => patchNested("assembly", key, value)}
          />
        )}
      </Form>
    </Modal>

    {printing ? (
      <DocumentPrintOffscreenPortal open onClose={handlePrintDone}>
        <SimpleDatasheetPrintSheet
          motorType={isDc ? "DC" : "AC"}
          datasheet={printDatasheet}
          printContext={resolvedPrintContext}
          technicianLabel={technicianLabel}
          jobDiagrams={Array.isArray(jobDiagrams) ? jobDiagrams : []}
        />
      </DocumentPrintOffscreenPortal>
    ) : null}

    <SimpleServiceProposalAttachmentsModal
      open={attachmentsOpen}
      onClose={() => setAttachmentsOpen(false)}
      recordId={recordId || null}
      attachments={Array.isArray(attachments) ? attachments : []}
      onAttached={onAttached}
    />

    <SimpleDiagramModal
      open={diagramOpen}
      onClose={() => setDiagramOpen(false)}
      recordId={recordId || null}
      jobDiagrams={Array.isArray(jobDiagrams) ? jobDiagrams : []}
      onSaved={(nextDiagrams) => {
        onDiagramsChange?.(Array.isArray(nextDiagrams) ? nextDiagrams : []);
      }}
    />
    </>
  );
}
