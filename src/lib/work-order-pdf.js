import PDFDocument from "pdfkit";
import {
  AC_WORK_ORDER_FIELDS,
  DC_WORK_ORDER_FIELDS,
  DC_ARMATURE_FIELDS,
  JOB_TYPE_OPTIONS,
} from "@/lib/work-order-fields";

function jobTypeLabel(value) {
  return JOB_TYPE_OPTIONS.find((o) => o.value === value)?.label || value || "—";
}

function specRows(fields, specs) {
  const bag = specs && typeof specs === "object" ? specs : {};
  return fields
    .map(({ key, label }) => {
      const v = String(bag[key] ?? "").trim();
      if (!v) return null;
      return { label, value: v };
    })
    .filter(Boolean);
}

function drawSection(doc, title, rows, { startY } = {}) {
  if (!rows.length) return startY ?? doc.y;
  let y = startY ?? doc.y;
  if (y > doc.page.height - 120) {
    doc.addPage();
    y = 50;
  }
  doc.font("Helvetica-Bold").fontSize(11).text(title, 50, y);
  y = doc.y + 6;
  doc.font("Helvetica").fontSize(9);
  for (const { label, value } of rows) {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 50;
      doc.font("Helvetica").fontSize(9);
    }
    doc.text(`${label}: ${value}`, 50, y, { width: doc.page.width - 100 });
    y = doc.y + 4;
  }
  return y + 8;
}

function drawBulletList(doc, title, lines, { startY } = {}) {
  const items = (lines || []).map((t) => String(t || "").trim()).filter(Boolean);
  if (!items.length) return startY ?? doc.y;
  let y = startY ?? doc.y;
  if (y > doc.page.height - 100) {
    doc.addPage();
    y = 50;
  }
  doc.font("Helvetica-Bold").fontSize(11).text(title, 50, y);
  y = doc.y + 6;
  doc.font("Helvetica").fontSize(9);
  for (const line of items) {
    if (y > doc.page.height - 50) {
      doc.addPage();
      y = 50;
      doc.font("Helvetica").fontSize(9);
    }
    doc.text(`• ${line}`, 58, y, { width: doc.page.width - 108 });
    y = doc.y + 3;
  }
  return y + 8;
}

/**
 * Build a work order PDF buffer for email attachment.
 * @param {object} data — work order + related display fields
 */
export function buildWorkOrderPdfBuffer(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const shop = String(data.shopName || "Motor shop").trim();
    const woNum = String(data.workOrderNumber || "").trim() || "—";

    doc.font("Helvetica-Bold").fontSize(16).text(shop, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(13).text(`Work order ${woNum}`, { align: "center" });
    doc.moveDown(1);

    doc.font("Helvetica").fontSize(10);
    const headerRows = [
      ["Date", data.date || "—"],
      ["RFQ#", data.quoteRfqNumber || "—"],
      ["Company", data.customerCompany || "—"],
      ["Technician", data.technicianName || "—"],
      ["Job type", jobTypeLabel(data.jobType)],
      ["Status", data.status || "—"],
      ["Motor class", data.motorClass || "—"],
    ];
    for (const [label, value] of headerRows) {
      doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
      doc.font("Helvetica").text(String(value));
    }
    doc.moveDown(0.5);

    if (data.notes?.trim()) {
      doc.font("Helvetica-Bold").text("Notes");
      doc.font("Helvetica").text(String(data.notes).trim(), { width: doc.page.width - 100 });
      doc.moveDown(0.5);
    }

    const scopeLines = (data.quoteScopeForTech || [])
      .map((r) => String(r?.scope ?? "").trim())
      .filter(Boolean);
    const otherLines = (data.quoteOtherCostForTech || [])
      .map((r) => {
        const item = String(r?.item ?? "").trim();
        if (!item) return "";
        const qty = String(r?.qty ?? "1").trim();
        const uom = String(r?.uom ?? "").trim();
        return uom ? `${item} (${qty} ${uom})` : `${item} (${qty})`;
      })
      .filter(Boolean);

    let y = drawBulletList(doc, "Scope from quote", scopeLines);
    y = drawBulletList(doc, "Other cost items", otherLines, { startY: y });

    if (data.motorClass === "AC") {
      y = drawSection(doc, "AC motor — winding & mechanical", specRows(AC_WORK_ORDER_FIELDS, data.acSpecs), {
        startY: y,
      });
    }
    if (data.motorClass === "DC") {
      y = drawSection(doc, "DC motor", specRows(DC_WORK_ORDER_FIELDS, data.dcSpecs), { startY: y });
      y = drawSection(doc, "Armature", specRows(DC_ARMATURE_FIELDS, data.armatureSpecs), { startY: y });
    }

    doc.font("Helvetica").fontSize(8).fillColor("#666666").text(
      `Generated ${new Date().toLocaleString()}`,
      50,
      doc.page.height - 40,
      { align: "center", width: doc.page.width - 100 }
    );

    doc.end();
  });
}
