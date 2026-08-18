"use client";

import { PrintShopLogo } from "@/components/dashboard/print-shop-logo";
import { useFormatDate, useUserSettings } from "@/contexts/user-settings-context";
import {
  AC_DATASHEET_FIELD_COLUMNS,
  AC_DISASSEMBLY_SURGE_FAILURE_KEYS,
  AC_DISASSEMBLY_VISUAL_STATUS_ROWS,
  DC_ARMATURE_FIELD_COLUMNS,
  DC_FIELD_FRAME_FIELD_COLUMNS,
} from "@/lib/simple-datasheet-form";

function cellValue(v) {
  const s = String(v ?? "").trim();
  return s || "-";
}

function PrintMetaRow({ label, value }) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5 leading-relaxed">
      <span className="shrink-0 text-sm font-normal text-black">{label}:</span>
      <span className="min-w-0 break-words text-base font-bold text-black">{cellValue(value)}</span>
    </div>
  );
}

function PrintFieldGrid({ columns, values }) {
  if (!Array.isArray(columns) || columns.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-2.5">
      {columns.map((col, colIdx) => (
        <div key={colIdx} className="flex min-w-0 flex-col gap-2">
          {col.map((field) => (
            <div key={field.key} className="flex min-w-0 items-baseline gap-2 leading-relaxed">
              <span className="w-[8.75rem] shrink-0 text-right text-sm font-normal text-black">
                {field.label}
              </span>
              <span className="min-w-0 flex-1 border-b border-black/35 px-1 pb-0.5 text-base font-bold text-black">
                {cellValue(values?.[field.key])}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PrintNotes({ label = "Notes:", notes }) {
  return (
    <div className="mt-5">
      <div className="mb-1.5 text-sm font-normal text-black">{label}</div>
      <div className="min-h-[5rem] whitespace-pre-wrap border border-black/40 p-3 text-base font-bold leading-relaxed text-black">
        {cellValue(notes) === "-" ? "" : String(notes || "")}
      </div>
    </div>
  );
}

function PrintSection({ title, children }) {
  return (
    <section className="bg-white text-black">
      <h2 className="mb-4 border-b-2 border-black pb-1.5 text-xl font-bold uppercase tracking-wide text-black">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PrintTabPage({ headerProps, title, pageBreakBefore = false, children }) {
  return (
    <div
      className="bg-white px-1 py-2 text-black"
      style={pageBreakBefore ? { pageBreakBefore: "always", breakBefore: "page" } : undefined}
    >
      <PrintDocumentHeader title={title} {...headerProps} />
      {children}
    </div>
  );
}

function PrintHeaderMetaRow({ label, value }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs font-normal uppercase tracking-[0.08em] text-black/70">{label}</span>
      <span className="min-w-0 break-words text-lg font-bold leading-snug text-black">
        {cellValue(value)}
      </span>
    </div>
  );
}

function PrintDocumentHeader({
  title,
  logoUrl,
  customerName,
  documentLabel,
  documentNumber,
  date,
  technician,
  contactName = "",
  customerPhone = "",
  customerEmail = "",
  customerPo = "",
}) {
  return (
    <div className="mb-7 border-b-[3px] border-black pb-5">
      <div className="mb-4 flex items-center gap-4">
        <PrintShopLogo
          logoUrl={logoUrl}
          alt=""
          variant="lg"
        />
        <h1 className="min-w-0 flex-1 text-center text-2xl font-bold tracking-wide">{title}</h1>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-8 gap-y-3.5 border border-black/25 bg-black/[0.03] px-4 py-3.5 sm:grid-cols-3">
        <PrintHeaderMetaRow label="Customer" value={customerName} />
        <PrintHeaderMetaRow label={documentLabel || "RFQ#"} value={documentNumber} />
        <PrintHeaderMetaRow label="Contact" value={contactName} />
        <PrintHeaderMetaRow label="Phone" value={customerPhone} />
        <PrintHeaderMetaRow label="Email" value={customerEmail} />
        <PrintHeaderMetaRow label="Date" value={date} />
        <PrintHeaderMetaRow label="Technician" value={technician} />
        <PrintHeaderMetaRow label="Customer PO#" value={customerPo} />
      </div>
    </div>
  );
}

function boolYes(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on" ? "Yes" : "-";
}

function PrintTestBlock({ title, children }) {
  return (
    <div className="mt-5">
      <h3 className="mb-2.5 border-b border-black/40 pb-1 text-sm font-bold tracking-wide text-black">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">{children}</div>
    </div>
  );
}

function AcDisassemblyPrintBody({ values, jobStatusLabel = "" }) {
  const v = values || {};
  const magger = v.maggerTest === "pass" ? "Pass" : v.maggerTest === "fail" ? "Fail" : cellValue(v.maggerTest);
  const highPot = v.highPotTest === "pass" ? "Pass" : v.highPotTest === "fail" ? "Fail" : cellValue(v.highPotTest);
  const surge = v.surgeTest === "pass" ? "Pass" : v.surgeTest === "fail" ? "Fail" : cellValue(v.surgeTest);
  const pairs = [
    [
      "Marked Motor Sides",
      [
        boolYes(v.markedMotorSidesF1) === "Yes" ? "F1" : "",
        boolYes(v.markedMotorSidesF2) === "Yes" ? "F2" : "",
        String(v.markedMotorSidesNotes || "").trim(),
      ]
        .filter(Boolean)
        .join(" · ") || v.markedMotorSides,
    ],
    ["Junction Box Location", v.junctionBoxLocation],
    ["Incoming Notes", v.brokenPartsNotes],
    ["End Bell Fit DE", v.endBellFitDE],
    ["End Bell Fit ODE", v.endBellFitODE],
    ["Shaft Measurement DE", v.rotorFitDE],
    ["Shaft Management ODE", v.rotorFitODE],
    ["Shaft Runout", v.shaftRunout],
    ["Number Of Bearings DE", v.numberOfBearingsDE ?? v.numberOfBearings],
    ["Number Of Bearings ODE", v.numberOfBearingsODE],
    ["Bearing Size DE", v.bearingSizeDE],
    ["Bearing Size ODE", v.bearingSizeODE],
    ["Seal Size DE", v.sealSizeDE],
    ["Seal Size ODE", v.sealSizeODE],
    ["Other Notes", v.otherNotes],
  ];
  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
        {AC_DISASSEMBLY_VISUAL_STATUS_ROWS.map(({ key, label }) => (
          <PrintMetaRow
            key={key}
            label={label}
            value={
              v[key] === "good" ? "Good" : v[key] === "bad" ? "Bad" : cellValue(v[key])
            }
          />
        ))}
      </div>
      <PrintMetaRow label="Visual Status Notes" value={v.visualStatusNotes} />
      <PrintMetaRow label="Status" value={jobStatusLabel || v.status} />
      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
        {pairs.map(([label, value]) => (
          <PrintMetaRow key={label} label={label} value={value} />
        ))}
      </div>

      <PrintTestBlock title="Magger Test">
        <PrintMetaRow label="Magger Voltage" value={v.maggerVoltage} />
        <PrintMetaRow label="Meggar Readings" value={v.maggerMicroAmps} />
        <PrintMetaRow label="Result" value={magger} />
      </PrintTestBlock>

      <PrintTestBlock title="High-pot test">
        <PrintMetaRow label="High-pot Voltage" value={v.highPotVoltage} />
        <PrintMetaRow label="High-pot Micro Amps" value={v.highPotMicroAmps} />
        <PrintMetaRow label="Result" value={highPot} />
      </PrintTestBlock>

      <PrintTestBlock title="Surge Test">
        <PrintMetaRow label="Surge Voltage" value={v.surgeVoltage} />
        <PrintMetaRow label="Result" value={surge} />
        {AC_DISASSEMBLY_SURGE_FAILURE_KEYS.map(({ key, label }) => (
          <PrintMetaRow key={key} label={label} value={boolYes(v[key])} />
        ))}
      </PrintTestBlock>
    </div>
  );
}

function AcAssemblyPrintBody({ values }) {
  const v = values || {};
  const magger = v.maggerTest === "pass" ? "Pass" : v.maggerTest === "fail" ? "Fail" : cellValue(v.maggerTest);
  const highPot = v.highPotTest === "pass" ? "Pass" : v.highPotTest === "fail" ? "Fail" : cellValue(v.highPotTest);
  const surge = v.surgeTest === "pass" ? "Pass" : v.surgeTest === "fail" ? "Fail" : cellValue(v.surgeTest);
  const testRunPairs = [
    ["Run Voltage Test", v.voltageTest],
    ["RPM", v.rpm],
    ["Lead1 Amp", v.lead1Amp],
    ["Lead2 Amp", v.lead2Amp],
    ["Lead3 Amp", v.lead3Amp],
    ["Paint And Prepared To Ship", boolYes(v.paintAndPreparedToShip)],
    ["Motor Incoming Paint", v.motorIncomingPaint],
    ["Motor Outgoing Paint", v.motorOutgoingPaint],
  ];
  return (
    <div className="space-y-4 text-xs">
      <PrintTestBlock title="Magger Test">
        <PrintMetaRow label="Magger Voltage" value={v.maggerVoltage} />
        <PrintMetaRow label="Meggar Readings" value={v.maggerMicroAmps} />
        <PrintMetaRow label="Result" value={magger} />
      </PrintTestBlock>
      <PrintTestBlock title="High-pot test">
        <PrintMetaRow label="High-pot Voltage" value={v.highPotVoltage} />
        <PrintMetaRow label="High-pot Micro Amps" value={v.highPotMicroAmps} />
        <PrintMetaRow label="Result" value={highPot} />
      </PrintTestBlock>
      <PrintTestBlock title="Surge Test">
        <PrintMetaRow label="Surge Voltage" value={v.surgeVoltage} />
        <PrintMetaRow label="Result" value={surge} />
        {AC_DISASSEMBLY_SURGE_FAILURE_KEYS.map(({ key, label }) => (
          <PrintMetaRow key={key} label={label} value={boolYes(v[key])} />
        ))}
      </PrintTestBlock>
      <PrintTestBlock title="Test Runs">
        {testRunPairs.map(([label, value]) => (
          <PrintMetaRow key={label} label={label} value={value} />
        ))}
      </PrintTestBlock>
    </div>
  );
}

/**
 * Printable datasheet — continuous sections (no forced page break per tab).
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
  const customerName = String(
    printContext.customerName || printContext.companyName || datasheet?.company || ""
  ).trim();
  const contactName = String(printContext.contactName || "").trim();
  const documentNumber = String(
    printContext.documentNumber || datasheet?.jobNumber || ""
  ).trim();
  const documentLabel = String(printContext.documentLabel || "RFQ#").trim() || "RFQ#";
  const customerPhone = String(printContext.customerPhone || "").trim();
  const customerEmail = String(printContext.customerEmail || "").trim();
  const customerPo = String(printContext.customerPo || "").trim();
  const dateRaw = String(datasheet?.date || "").trim();
  const date = dateRaw ? formatDate(dateRaw) : "-";
  const technician = String(technicianLabel || datasheet?.technician || "").trim();

  const headerProps = {
    logoUrl,
    customerName,
    contactName,
    documentLabel,
    documentNumber,
    date,
    technician,
    customerPhone,
    customerEmail,
    customerPo,
  };

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
        <PrintTabPage headerProps={headerProps} title="AC DataSheet">
          <PrintSection title="DataSheet">
            <PrintFieldGrid columns={AC_DATASHEET_FIELD_COLUMNS} values={dataSheet} />
            <PrintNotes notes={dataSheet?.notes} />
          </PrintSection>
        </PrintTabPage>
        {complete ? (
          <>
            <PrintTabPage headerProps={headerProps} title="AC Disassembly" pageBreakBefore>
              <PrintSection title="Disassembly">
                <AcDisassemblyPrintBody
                  values={disassembly}
                  jobStatusLabel={String(printContext.jobStatusLabel || printContext.jobStatus || "").trim()}
                />
                <PrintNotes label="Final Notes:" notes={disassembly.finalNotes} />
              </PrintSection>
            </PrintTabPage>
            <PrintTabPage headerProps={headerProps} title="AC Assembly" pageBreakBefore>
              <PrintSection title="Assembly">
                <AcAssemblyPrintBody values={assembly} />
                <PrintNotes notes={assembly.notes} />
              </PrintSection>
            </PrintTabPage>
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
        <PrintTabPage headerProps={headerProps} title="DC Field Frame">
          <PrintSection title="Field Frame">
            <PrintFieldGrid columns={DC_FIELD_FRAME_FIELD_COLUMNS} values={fieldFrame} />
            <PrintNotes notes={fieldFrame.notes} />
          </PrintSection>
        </PrintTabPage>
      ) : null}
      {showArmature ? (
        <PrintTabPage
          headerProps={headerProps}
          title="DC Armature"
          pageBreakBefore={showFieldFrame}
        >
          <PrintSection title="Armature">
            <PrintFieldGrid columns={DC_ARMATURE_FIELD_COLUMNS} values={armature} />
            <PrintNotes notes={armature.notes} />
          </PrintSection>
        </PrintTabPage>
      ) : null}
    </div>
  );
}
