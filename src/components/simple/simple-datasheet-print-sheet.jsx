"use client";

import { PrintShopLogo } from "@/components/dashboard/print-shop-logo";
import { useFormatDate, useUserSettings } from "@/contexts/user-settings-context";
import {
  AC_DATASHEET_FIELD_COLUMNS,
  AC_DISASSEMBLY_STATUS_OPTIONS,
  AC_DISASSEMBLY_SURGE_FAILURE_KEYS,
  DC_ARMATURE_FIELD_COLUMNS,
  DC_FIELD_FRAME_FIELD_COLUMNS,
} from "@/lib/simple-datasheet-form";

function cellValue(v) {
  const s = String(v ?? "").trim();
  return s || "—";
}

function PrintMetaRow({ label, value }) {
  return (
    <div className="flex min-w-0 gap-1 text-[11px] leading-tight">
      <span className="shrink-0 font-semibold text-black">{label}:</span>
      <span className="min-w-0 break-words text-black">{cellValue(value)}</span>
    </div>
  );
}

function PrintFieldGrid({ columns, values }) {
  if (!Array.isArray(columns) || columns.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-1">
      {columns.map((col, colIdx) => (
        <div key={colIdx} className="flex min-w-0 flex-col gap-0.5">
          {col.map((field) => (
            <div key={field.key} className="flex min-w-0 items-baseline gap-1 text-[11px] leading-tight">
              <span className="w-[7.5rem] shrink-0 text-right font-semibold text-black">{field.label}</span>
              <span className="min-w-0 flex-1 border-b border-black/30 px-0.5 text-black">
                {cellValue(values?.[field.key])}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DatasheetPrintPage({
  title,
  logoUrl,
  customerName,
  documentLabel,
  documentNumber,
  date,
  technician,
  company,
  columns,
  values,
  notes,
  notesLabel = "Notes:",
  children = null,
  pageBreakBefore = false,
}) {
  return (
    <div
      className="bg-white text-black"
      style={pageBreakBefore ? { pageBreakBefore: "always", breakBefore: "page" } : undefined}
    >
      <div className="mb-3 border-b border-black pb-2">
        <div className="mb-2 flex items-center gap-3">
          <PrintShopLogo logoUrl={logoUrl} alt="" />
          <h1 className="min-w-0 flex-1 text-center text-lg font-bold tracking-wide">{title}</h1>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
          <PrintMetaRow label="Customer" value={customerName} />
          <PrintMetaRow label={documentLabel || "RFQ#"} value={documentNumber} />
          <PrintMetaRow label="Company" value={company || customerName} />
          <PrintMetaRow label="Date" value={date} />
          <PrintMetaRow label="Technician" value={technician} />
          <PrintMetaRow label="Job#" value={documentNumber} />
        </div>
      </div>
      {children}
      <PrintFieldGrid columns={columns} values={values} />
      {notes != null || notesLabel ? (
        <div className="mt-4">
          <div className="mb-1 text-[11px] font-semibold text-black">{notesLabel}</div>
          <div className="min-h-[4rem] whitespace-pre-wrap border border-black/40 p-2 text-[11px] leading-snug text-black">
            {cellValue(notes) === "—" ? "" : String(notes || "")}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function boolYes(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on" ? "Yes" : "—";
}

function statusLabel(value, options) {
  const hit = (options || []).find((o) => o.value === value);
  return hit?.label || cellValue(value);
}

function AcDisassemblyPrintBody({ values }) {
  const v = values || {};
  const visual =
    v.visualStatus === "good" ? "Visually Good" : v.visualStatus === "burned" ? "Visually Burned" : cellValue(v.visualStatus);
  const magger = v.maggerTest === "pass" ? "Pass" : v.maggerTest === "fail" ? "Fail" : cellValue(v.maggerTest);
  const surge = v.surgeTest === "pass" ? "Pass" : v.surgeTest === "fail" ? "Fail" : cellValue(v.surgeTest);
  const pairs = [
    ["IncomingLeads", v.incomingLeads],
    ["Marked Motor Sides", v.markedMotorSides],
    ["Junction Box Location", v.junctionBoxLocation],
    ["Broken Parts Notes", v.brokenPartsNotes],
    ["End Bell Fit DE", v.endBellFitDE],
    ["End Bell Fit ODE", v.endBellFitODE],
    ["Rotor Fit DE", v.rotorFitDE],
    ["Rotor Fit ODE", v.rotorFitODE],
    ["Shaft Measurement", v.shaftMeasurement],
    ["Shaft Runout", v.shaftRunout],
    ["Number Of Bearings", v.numberOfBearings],
    ["Bearing Size DE", v.bearingSizeDE],
    ["Bearing Size ODE", v.bearingSizeODE],
    ["Seal Size DE", v.sealSizeDE],
    ["Seal Size ODE", v.sealSizeODE],
    ["Other Notes", v.otherNotes],
    ["Magger Voltage", v.maggerVoltage],
    ["Magger Micro Amps", v.maggerMicroAmps],
    ["Magger Test Result", magger],
    ["Surge Voltage", v.surgeVoltage],
    ["Surge Test Result", surge],
  ];
  return (
    <div className="space-y-2 text-[11px]">
      <PrintMetaRow label="Visual Status" value={visual} />
      <PrintMetaRow label="Status" value={statusLabel(v.status, AC_DISASSEMBLY_STATUS_OPTIONS)} />
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {pairs.map(([label, value]) => (
          <PrintMetaRow key={label} label={label} value={value} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {AC_DISASSEMBLY_SURGE_FAILURE_KEYS.map(({ key, label }) => (
          <PrintMetaRow key={key} label={label} value={boolYes(v[key])} />
        ))}
      </div>
    </div>
  );
}

function AcAssemblyPrintBody({ values }) {
  const v = values || {};
  const pairs = [
    ["Date", v.date],
    ["Technician Name", v.technicianName],
    ["Voltage Test", v.voltageTest],
    ["RPM", v.rpm],
    ["Lead1 Amp", v.lead1Amp],
    ["Lead2 Amp", v.lead2Amp],
    ["Lead3 Amp", v.lead3Amp],
    ["Paint And Prepared To Ship", boolYes(v.paintAndPreparedToShip)],
    ["Motor Incoming Paint", v.motorIncomingPaint],
    ["Motor Outgoing Paint", v.motorOutgoingPaint],
  ];
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
      {pairs.map(([label, value]) => (
        <PrintMetaRow key={label} label={label} value={value} />
      ))}
    </div>
  );
}

/**
 * Printable datasheet sheet(s). Complete Motor prints Field Frame then Armature (page break).
 */
export default function SimpleDatasheetPrintSheet({
  motorType = "AC",
  datasheet,
  printContext = {},
  technicianLabel = "",
}) {
  const { settings } = useUserSettings();
  const formatDate = useFormatDate();
  const logoUrl = String(printContext.logoUrl || settings?.logoUrl || "").trim();
  const isDc = String(motorType || "AC").toUpperCase() === "DC";
  const customerName = String(printContext.customerName || "").trim();
  const documentNumber = String(
    printContext.documentNumber || datasheet?.jobNumber || ""
  ).trim();
  const documentLabel = String(printContext.documentLabel || "RFQ#").trim() || "RFQ#";
  const company = String(printContext.companyName || datasheet?.company || customerName).trim();
  const dateRaw = String(datasheet?.date || "").trim();
  const date = dateRaw ? formatDate(dateRaw) : "—";
  const technician = String(technicianLabel || datasheet?.technician || "").trim();

  if (!isDc) {
    const section = String(datasheet?.section || "Complete Motor").trim();
    const dataSheet =
      datasheet?.dataSheet && typeof datasheet.dataSheet === "object"
        ? datasheet.dataSheet
        : datasheet;
    const disassembly =
      datasheet?.disassembly && typeof datasheet.disassembly === "object" ? datasheet.disassembly : {};
    const assembly =
      datasheet?.assembly && typeof datasheet.assembly === "object" ? datasheet.assembly : {};
    const complete = section === "Complete Motor";

    return (
      <div className="bg-white text-black">
        <DatasheetPrintPage
          title="AC DataSheet"
          logoUrl={logoUrl}
          customerName={customerName}
          documentLabel={documentLabel}
          documentNumber={documentNumber}
          date={date}
          technician={technician}
          company={company}
          columns={AC_DATASHEET_FIELD_COLUMNS}
          values={dataSheet}
          notes={dataSheet?.notes}
        />
        {complete ? (
          <>
            <DatasheetPrintPage
              title="AC Disassembly"
              logoUrl={logoUrl}
              customerName={customerName}
              documentLabel={documentLabel}
              documentNumber={documentNumber}
              date={date}
              technician={technician}
              company={company}
              columns={[]}
              values={{}}
              notes={disassembly.finalNotes}
              notesLabel="Final Notes:"
              pageBreakBefore
            >
              <AcDisassemblyPrintBody values={disassembly} />
            </DatasheetPrintPage>
            <DatasheetPrintPage
              title="AC Assembly"
              logoUrl={logoUrl}
              customerName={customerName}
              documentLabel={documentLabel}
              documentNumber={documentNumber}
              date={assembly.date ? formatDate(assembly.date) : date}
              technician={assembly.technicianName || technician}
              company={company}
              columns={[]}
              values={{}}
              notes={assembly.notes}
              pageBreakBefore
            >
              <AcAssemblyPrintBody values={assembly} />
            </DatasheetPrintPage>
          </>
        ) : null}
      </div>
    );
  }

  const section = String(datasheet?.section || "Complete Motor").trim();
  const fieldFrame = datasheet?.fieldFrame && typeof datasheet.fieldFrame === "object" ? datasheet.fieldFrame : {};
  const armature = datasheet?.armature && typeof datasheet.armature === "object" ? datasheet.armature : {};

  const showFieldFrame = section === "Complete Motor" || section === "Field Frame";
  const showArmature = section === "Complete Motor" || section === "Armature";

  return (
    <div className="bg-white text-black">
      {showFieldFrame ? (
        <DatasheetPrintPage
          title="DC Field Frame"
          logoUrl={logoUrl}
          customerName={customerName}
          documentLabel={documentLabel}
          documentNumber={documentNumber}
          date={date}
          technician={technician}
          company={company}
          columns={DC_FIELD_FRAME_FIELD_COLUMNS}
          values={fieldFrame}
          notes={fieldFrame.notes}
        />
      ) : null}
      {showArmature ? (
        <DatasheetPrintPage
          title="DC Armature"
          logoUrl={logoUrl}
          customerName={customerName}
          documentLabel={documentLabel}
          documentNumber={documentNumber}
          date={date}
          technician={technician}
          company={company}
          columns={DC_ARMATURE_FIELD_COLUMNS}
          values={armature}
          notes={armature.notes}
          pageBreakBefore={showFieldFrame}
        />
      ) : null}
    </div>
  );
}
