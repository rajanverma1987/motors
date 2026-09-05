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
  return s || "—";
}

function displayOrBlank(v) {
  const s = String(v ?? "").trim();
  return s || "";
}

function boolYes(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on" ? "Yes" : "—";
}

function passFailLabel(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "pass") return "PASS";
  if (s === "fail") return "FAIL";
  return cellValue(v);
}

function visualStatusLabel(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "good") return "Good";
  if (s === "bad") return "Bad";
  return cellValue(v);
}

const AC_COLUMN_TITLES = ["Nameplate", "Winding", "Core & accessories"];
const DC_FF_COLUMN_TITLES = ["Nameplate", "Connection & leads", "Core & poles"];
const DC_ARM_COLUMN_TITLES = ["Nameplate", "Winding", "Commutator & iron"];

function MetaCell({ label, value, colSpan = 1 }) {
  return (
    <td
      colSpan={colSpan}
      className="border border-black px-1.5 py-1 align-top"
      style={{ width: `${(100 / 4) * colSpan}%` }}
    >
      <div className="text-[7.5pt] font-semibold uppercase tracking-wide text-black/70">{label}</div>
      <div className="min-h-[1.1rem] break-words text-[10pt] font-semibold leading-snug text-black">
        {cellValue(value)}
      </div>
    </td>
  );
}

function PrintDocumentHeader({
  title,
  subtitle = "",
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
  printedAt = "",
  compact = false,
}) {
  if (compact) {
    return (
      <header className="mb-3 border-b-2 border-black pb-2">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[14pt] font-bold leading-none tracking-tight text-black">{title}</div>
            {subtitle ? (
              <div className="mt-0.5 text-[8pt] font-semibold uppercase tracking-wide text-black/70">
                {subtitle}
              </div>
            ) : null}
          </div>
          <div className="shrink-0 text-right text-[9pt] leading-snug text-black">
            <div>
              <span className="font-semibold">{documentLabel || "Job#"}:</span>{" "}
              <span className="font-bold tabular-nums">{cellValue(documentNumber)}</span>
            </div>
            <div className="max-w-[14rem] truncate">
              <span className="font-semibold">Customer:</span> {cellValue(customerName)}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="mb-2 -mt-1">
      <div className="mb-1.5 flex items-start justify-between gap-3 border-b-2 border-black pb-1.5">
        <div className="min-w-0 shrink-0 -mt-0.5">
          <PrintShopLogo logoUrl={logoUrl} alt="" variant="default" />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <div className="text-[8pt] font-semibold uppercase tracking-[0.14em] text-black/65">
            Motor repair datasheet
          </div>
          <h1 className="mt-0.5 text-[16pt] font-bold leading-none tracking-tight text-black">{title}</h1>
          <div className="mt-1 flex flex-wrap items-baseline justify-end gap-x-2 text-[9pt] text-black">
            {subtitle ? (
              <span className="font-semibold uppercase tracking-wide text-black/75">{subtitle}</span>
            ) : null}
            <span className="font-bold tabular-nums">
              {documentLabel || "Job#"} {cellValue(documentNumber)}
            </span>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse table-fixed">
        <tbody>
          <tr>
            <MetaCell label="Customer" value={customerName} colSpan={2} />
            <MetaCell label={documentLabel || "Document #"} value={documentNumber} />
            <MetaCell label="Date" value={date} />
          </tr>
          <tr>
            <MetaCell label="Contact" value={contactName} />
            <MetaCell label="Phone" value={customerPhone} />
            <MetaCell label="Technician" value={technician} />
            <MetaCell label="Customer PO#" value={customerPo} />
          </tr>
        </tbody>
      </table>
    </header>
  );
}

function FieldCell({ label, value }) {
  return (
    <td className="border border-black p-0 align-middle">
      <div className="grid grid-cols-[38%_62%] items-stretch">
        <div className="border-r border-black bg-black/[0.04] px-1 py-0.5 text-right text-[7.5pt] font-semibold leading-tight text-black">
          {label}
        </div>
        <div className="min-h-[1.1rem] break-words px-1.5 py-0.5 text-[9.5pt] font-semibold leading-tight text-black">
          {displayOrBlank(value) || "\u00a0"}
        </div>
      </div>
    </td>
  );
}

/**
 * Industry-style 3-column label/value form table (matches shop rewind sheets).
 */
function PrintFieldGrid({ columns, values, columnTitles = [] }) {
  if (!Array.isArray(columns) || columns.length === 0) return null;
  const maxRows = Math.max(...columns.map((col) => (Array.isArray(col) ? col.length : 0)), 0);
  const colCount = columns.length;

  return (
    <table className="w-full border-collapse table-fixed">
      {columnTitles.length > 0 ? (
        <thead>
          <tr>
            {columns.map((_, colIdx) => (
              <th
                key={colIdx}
                className="border border-black bg-black px-1.5 py-1 text-left text-[8pt] font-bold uppercase tracking-wide text-white"
              >
                {columnTitles[colIdx] || `Column ${colIdx + 1}`}
              </th>
            ))}
          </tr>
        </thead>
      ) : null}
      <tbody>
        {Array.from({ length: maxRows }).map((_, rowIdx) => (
          <tr key={rowIdx}>
            {columns.map((col, colIdx) => {
              const field = Array.isArray(col) ? col[rowIdx] : null;
              if (!field) {
                return (
                  <td
                    key={colIdx}
                    className="border border-black bg-white p-0"
                    style={{ width: `${100 / colCount}%` }}
                  >
                    <div className="min-h-[1.1rem]">&nbsp;</div>
                  </td>
                );
              }
              return (
                <FieldCell
                  key={field.key}
                  label={field.label}
                  value={values?.[field.key]}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PrintNotes({ label = "Notes", notes, minHeight = "2.25rem" }) {
  const text = displayOrBlank(notes);
  return (
    <div className="mt-2">
      <div className="border border-black bg-black px-1.5 py-0.5 text-[8pt] font-bold uppercase tracking-wide text-white">
        {label}
      </div>
      <div
        className="whitespace-pre-wrap border border-t-0 border-black px-2 py-1.5 text-[9.5pt] font-medium leading-snug text-black"
        style={{ minHeight }}
      >
        {text || "\u00a0"}
      </div>
    </div>
  );
}

function PrintSectionBanner({ title }) {
  return (
    <div className="mb-1.5 border border-black bg-black px-2 py-1 text-[9pt] font-bold uppercase tracking-[0.12em] text-white">
      {title}
    </div>
  );
}

function SignatureBlock({ compact = false }) {
  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      <table className="w-full border-collapse table-fixed">
        <tbody>
          <tr>
            {[
              ["Technician signature", "Date"],
              ["Reviewed / approved", "Date"],
            ].map(([sig, dateLabel], i) => (
              <td
                key={i}
                className={`border border-black px-2 align-bottom ${compact ? "py-1" : "py-1.5"}`}
                style={{ width: "50%" }}
              >
                <div className={`mb-1.5 border-b border-black ${compact ? "pt-3.5" : "pt-5"}`} />
                <div className="flex items-end justify-between gap-4 text-[7.5pt] font-semibold uppercase tracking-wide text-black/75">
                  <span>{sig}</span>
                  <span className="inline-flex min-w-[5rem] flex-col">
                    <span className="mb-1.5 border-b border-black" />
                    {dateLabel}
                  </span>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PrintTabPage({
  headerProps,
  title,
  subtitle,
  pageBreakBefore = false,
  compactSignature = false,
  children,
}) {
  return (
    <div
      className="bg-white text-black"
      style={pageBreakBefore ? { pageBreakBefore: "always", breakBefore: "page" } : undefined}
    >
      <PrintDocumentHeader title={title} subtitle={subtitle} {...headerProps} compact={pageBreakBefore} />
      {children}
      <SignatureBlock compact={compactSignature} />
    </div>
  );
}

function PrintDiagramPages({ diagrams, headerProps }) {
  const list = Array.isArray(diagrams) ? diagrams.filter((d) => String(d?.url || "").trim()) : [];
  if (!list.length) return null;

  return (
    <>
      {list.map((diagram, index) => {
        const url = String(diagram.url || "").trim();
        const name = String(diagram.name || "").trim() || `Diagram ${index + 1}`;
        const templateName = String(diagram.templateName || "").trim();
        const subtitle = templateName && templateName !== name ? templateName : `Diagram ${index + 1} of ${list.length}`;
        return (
          <div
            key={diagram.id || url || index}
            className="datasheet-diagram-print-page bg-white text-black"
            style={{ pageBreakBefore: "always", breakBefore: "page" }}
          >
            <PrintDocumentHeader
              title={name}
              subtitle={subtitle}
              {...headerProps}
              compact
            />
            <div className="mt-2 flex min-h-[8.2in] items-center justify-center border border-black bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={name}
                className="datasheet-diagram-print-image max-h-[8.2in] max-w-full object-contain"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[8pt] text-black/70">
              <span>
                <span className="font-semibold">{headerProps.documentLabel || "Job#"}:</span>{" "}
                <span className="font-bold tabular-nums text-black">
                  {cellValue(headerProps.documentNumber)}
                </span>
              </span>
              <span className="max-w-[60%] truncate text-right">
                <span className="font-semibold">Customer:</span>{" "}
                <span className="font-semibold text-black">{cellValue(headerProps.customerName)}</span>
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

function HalfKv({ label, value, className = "" }) {
  return (
    <div className={`grid grid-cols-[38%_62%] items-stretch ${className}`.trim()}>
      <div className="border-r border-black bg-black/[0.04] px-1.5 py-[3px] text-right text-[7.5pt] font-semibold leading-tight text-black">
        {label}
      </div>
      <div className="min-h-[1.15rem] break-words px-1.5 py-[3px] text-[9.5pt] font-semibold leading-tight text-black">
        {cellValue(value)}
      </div>
    </div>
  );
}

function TwoColKvTable({ pairs }) {
  const rows = [];
  for (let i = 0; i < pairs.length; i += 2) {
    rows.push([pairs[i], pairs[i + 1] || null]);
  }
  return (
    <table className="w-full border-collapse table-fixed">
      <tbody>
        {rows.map((pair, idx) => (
          <tr key={idx}>
            {[0, 1].map((j) => {
              const item = pair[j];
              if (!item || !item[0]) {
                return <td key={j} className="w-1/2 border border-black p-0" />;
              }
              return (
                <td key={j} className="w-1/2 border border-black p-0 align-middle">
                  <HalfKv label={item[0]} value={item[1]} />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PrintTestBlock({ title, result, rows }) {
  const resultText = passFailLabel(result);
  const isFail = String(result || "").toLowerCase() === "fail";
  const isPass = String(result || "").toLowerCase() === "pass";
  return (
    <div className="mt-2 break-inside-avoid">
      <div className="flex items-stretch border border-black">
        <div className="flex-1 bg-black px-2 py-1 text-[8.5pt] font-bold uppercase tracking-wide text-white">
          {title}
        </div>
        <div
          className={`min-w-[5.5rem] px-2 py-1 text-center text-[9.5pt] font-bold tracking-wide ${
            isFail
              ? "bg-black text-white"
              : isPass
                ? "bg-black/[0.08] text-black"
                : "bg-white text-black"
          }`}
        >
          {resultText}
        </div>
      </div>
      <table className="w-full border-collapse table-fixed">
        <tbody>
          {(rows || []).map(([label, value]) => (
            <tr key={label}>
              <td className="w-[38%] border border-black bg-black/[0.04] px-1.5 py-[3px] text-right text-[7.5pt] font-semibold text-black">
                {label}
              </td>
              <td className="border border-black px-1.5 py-[3px] text-[9.5pt] font-semibold text-black">
                {cellValue(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AcDisassemblyPrintBody({ values, jobStatusLabel = "" }) {
  const v = values || {};
  const markedSides = [
    boolYes(v.markedMotorSidesF1) === "Yes" ? "F1" : "",
    boolYes(v.markedMotorSidesF2) === "Yes" ? "F2" : "",
    displayOrBlank(v.markedMotorSidesNotes),
  ]
    .filter(Boolean)
    .join(" · ") || displayOrBlank(v.markedMotorSides);

  const visualPairs = AC_DISASSEMBLY_VISUAL_STATUS_ROWS.map(({ key, label }) => [
    label,
    visualStatusLabel(v[key]),
  ]);

  const mechanicalPairs = [
    ["Marked motor sides", markedSides],
    ["Junction box location", v.junctionBoxLocation],
    ["Incoming / broken parts notes", v.brokenPartsNotes],
    ["End bell fit DE", v.endBellFitDE],
    ["End bell fit ODE", v.endBellFitODE],
    ["Shaft measurement DE", v.rotorFitDE],
    ["Shaft measurement ODE", v.rotorFitODE],
    ["Shaft runout", v.shaftRunout],
    ["No. of bearings DE", v.numberOfBearingsDE ?? v.numberOfBearings],
    ["No. of bearings ODE", v.numberOfBearingsODE],
    ["Bearing size DE", v.bearingSizeDE],
    ["Bearing size ODE", v.bearingSizeODE],
    ["Seal size DE", v.sealSizeDE],
    ["Seal size ODE", v.sealSizeODE],
    ["Other notes", v.otherNotes],
    ["Job status", jobStatusLabel || v.status],
  ];

  return (
    <div>
      <PrintSectionBanner title="Visual inspection" />
      <TwoColKvTable pairs={visualPairs} />
      {displayOrBlank(v.visualStatusNotes) ? (
        <div className="mt-2">
          <PrintNotes label="Visual status notes" notes={v.visualStatusNotes} minHeight="2rem" />
        </div>
      ) : null}

      <div className="mt-3">
        <PrintSectionBanner title="Mechanical measurements" />
        <TwoColKvTable pairs={mechanicalPairs} />
      </div>

      <div className="mt-2 space-y-0">
        <PrintTestBlock
          title="Megger test"
          result={v.maggerTest}
          rows={[
            ["Voltage", v.maggerVoltage],
            ["Readings", v.maggerMicroAmps],
          ]}
        />
        <PrintTestBlock
          title="High-pot test"
          result={v.highPotTest}
          rows={[
            ["Voltage", v.highPotVoltage],
            ["Micro amps", v.highPotMicroAmps],
          ]}
        />
        <PrintTestBlock
          title="Surge test"
          result={v.surgeTest}
          rows={[
            ["Voltage", v.surgeVoltage],
            ...AC_DISASSEMBLY_SURGE_FAILURE_KEYS.map(({ key, label }) => [label, boolYes(v[key])]),
          ]}
        />
      </div>
    </div>
  );
}

function AcAssemblyPrintBody({ values }) {
  const v = values || {};
  const testRunPairs = [
    ["Run voltage test", v.voltageTest],
    ["RPM", v.rpm],
    ["Lead 1 amp", v.lead1Amp],
    ["Lead 2 amp", v.lead2Amp],
    ["Lead 3 amp", v.lead3Amp],
    ["Paint & prepared to ship", boolYes(v.paintAndPreparedToShip)],
    ["Motor incoming paint", v.motorIncomingPaint],
    ["Motor outgoing paint", v.motorOutgoingPaint],
  ];

  return (
    <div>
      <div className="space-y-0">
        <PrintTestBlock
          title="Megger test"
          result={v.maggerTest}
          rows={[
            ["Voltage", v.maggerVoltage],
            ["Readings", v.maggerMicroAmps],
          ]}
        />
        <PrintTestBlock
          title="High-pot test"
          result={v.highPotTest}
          rows={[
            ["Voltage", v.highPotVoltage],
            ["Micro amps", v.highPotMicroAmps],
          ]}
        />
        <PrintTestBlock
          title="Surge test"
          result={v.surgeTest}
          rows={[
            ["Voltage", v.surgeVoltage],
            ...AC_DISASSEMBLY_SURGE_FAILURE_KEYS.map(({ key, label }) => [label, boolYes(v[key])]),
          ]}
        />
      </div>
      <div className="mt-3">
        <PrintSectionBanner title="Test run" />
        <TwoColKvTable pairs={testRunPairs} />
      </div>
    </div>
  );
}

/**
 * Printable datasheet — professional letter-size shop form (bordered field grid).
 * Appends one page per saved job diagram with job # and customer header.
 */
export default function SimpleDatasheetPrintSheet({
  motorType = "AC",
  datasheet,
  printContext = {},
  technicianLabel = "",
  jobDiagrams = [],
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
  const date = dateRaw ? formatDate(dateRaw) : "—";
  const technician = String(technicianLabel || datasheet?.technician || "").trim();
  const printedAt = formatDate(new Date());

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
    printedAt,
  };

  const diagramPages = <PrintDiagramPages diagrams={jobDiagrams} headerProps={headerProps} />;

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
      <div className="datasheet-print-root bg-white text-black" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        <PrintTabPage
          headerProps={headerProps}
          title="AC Motor Datasheet"
          subtitle={section}
          compactSignature
        >
          <PrintFieldGrid
            columns={AC_DATASHEET_FIELD_COLUMNS}
            values={dataSheet}
            columnTitles={AC_COLUMN_TITLES}
          />
          <PrintNotes notes={dataSheet?.notes} minHeight="2rem" />
        </PrintTabPage>
        {complete ? (
          <>
            <PrintTabPage
              headerProps={headerProps}
              title="AC Disassembly"
              subtitle={section}
              pageBreakBefore
            >
              <AcDisassemblyPrintBody
                values={disassembly}
                jobStatusLabel={String(printContext.jobStatusLabel || printContext.jobStatus || "").trim()}
              />
              <PrintNotes label="Final notes" notes={disassembly.finalNotes} />
            </PrintTabPage>
            <PrintTabPage
              headerProps={headerProps}
              title="AC Assembly"
              subtitle={section}
              pageBreakBefore
            >
              <AcAssemblyPrintBody values={assembly} />
              <PrintNotes notes={assembly.notes} />
            </PrintTabPage>
          </>
        ) : null}
        {diagramPages}
      </div>
    );
  }

  const section = String(datasheet?.section || "Complete Motor").trim();
  const fieldFrame =
    datasheet?.fieldFrame && typeof datasheet.fieldFrame === "object" ? datasheet.fieldFrame : {};
  const armature =
    datasheet?.armature && typeof datasheet.armature === "object" ? datasheet.armature : {};

  const showFieldFrame = section === "Complete Motor" || section === "Field Frame";
  const showArmature = section === "Complete Motor" || section === "Armature";

  return (
    <div className="datasheet-print-root bg-white text-black" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {showFieldFrame ? (
        <PrintTabPage
          headerProps={headerProps}
          title="DC Field Frame Datasheet"
          subtitle={section}
        >
          <PrintSectionBanner title="Field frame data" />
          <PrintFieldGrid
            columns={DC_FIELD_FRAME_FIELD_COLUMNS}
            values={fieldFrame}
            columnTitles={DC_FF_COLUMN_TITLES}
          />
          <PrintNotes notes={fieldFrame.notes} />
        </PrintTabPage>
      ) : null}
      {showArmature ? (
        <PrintTabPage
          headerProps={headerProps}
          title="DC Armature Datasheet"
          subtitle={section}
          pageBreakBefore={showFieldFrame}
        >
          <PrintSectionBanner title="Armature data" />
          <PrintFieldGrid
            columns={DC_ARMATURE_FIELD_COLUMNS}
            values={armature}
            columnTitles={DC_ARM_COLUMN_TITLES}
          />
          <PrintNotes notes={armature.notes} />
        </PrintTabPage>
      ) : null}
      {diagramPages}
    </div>
  );
}
