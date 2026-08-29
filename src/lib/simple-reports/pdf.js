import PDFDocument from "pdfkit";

/**
 * Build a landscape PDF table for a Simple report (all rows).
 * Cell text wraps fully (no ellipsis truncation); row height grows to fit.
 * @param {string} sheetName
 * @param {string[]} headers
 * @param {Array<Array<string|number|boolean|null|undefined>>} rows
 * @param {{ amountColumns?: number[], amountTotals?: Array<number|null>, subtitle?: string }} [options]
 * @returns {Promise<Buffer>}
 */
export function buildSimpleReportPdfBuffer(sheetName, headers, rows, options = {}) {
  const cols = Array.isArray(headers) ? headers.map((h) => String(h ?? "")) : [];
  const dataRows = Array.isArray(rows) ? rows : [];
  const amountSet = new Set(
    Array.isArray(options.amountColumns)
      ? options.amountColumns.filter((i) => Number.isInteger(i) && i >= 0 && i < cols.length)
      : []
  );
  const amountTotals = Array.isArray(options.amountTotals) ? options.amountTotals : [];
  const subtitle = String(options.subtitle || "").trim();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      layout: "landscape",
      margin: 28,
      info: {
        Title: String(sheetName || "Report"),
        Author: "IQMotorBase",
      },
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageBottom = doc.page.height - doc.page.margins.bottom;
    const colCount = Math.max(1, cols.length);
    const fontSize = colCount > 12 ? 6.5 : colCount > 9 ? 7 : 8;
    const headerFontSize = fontSize + 0.5;
    const colWidths = measureColumnWidths(cols, dataRows, pageWidth, amountSet);

    doc.font("Helvetica-Bold").fontSize(12).text(String(sheetName || "Report"), {
      align: "left",
    });
    if (subtitle) {
      doc.moveDown(0.15);
      doc.font("Helvetica").fontSize(8).fillColor("#555555").text(subtitle);
      doc.fillColor("#000000");
    }
    doc.moveDown(0.35);
    doc.font("Helvetica").fontSize(8).fillColor("#555555").text(`${dataRows.length} row${dataRows.length === 1 ? "" : "s"}`);
    doc.fillColor("#000000");
    doc.moveDown(0.4);

    let y = doc.y;

    const ensureSpace = (neededHeight, redrawHeader) => {
      if (y + neededHeight <= pageBottom) return;
      doc.addPage();
      y = doc.page.margins.top;
      if (redrawHeader) drawHeaderBlock();
    };

    const drawHeaderBlock = () => {
      const subtotalValues = cols.map((_, i) => {
        if (i === 0) return "Subtotal";
        if (!amountSet.has(i)) return "";
        const n = Number(amountTotals[i]);
        return Number.isFinite(n) ? formatAmount(n) : "";
      });
      ensureSpace(
        measureRowHeight(doc, subtotalValues, colWidths, amountSet, headerFontSize, true),
        false
      );
      y = drawTableRow(doc, {
        y,
        values: subtotalValues,
        colWidths,
        amountSet,
        fontSize: headerFontSize,
        bold: true,
        fill: "#E8EEF5",
        pageWidth,
      });
      ensureSpace(measureRowHeight(doc, cols, colWidths, amountSet, headerFontSize, true), false);
      y = drawTableRow(doc, {
        y,
        values: cols,
        colWidths,
        amountSet,
        fontSize: headerFontSize,
        bold: true,
        fill: "#F3F4F6",
        pageWidth,
      });
    };

    drawHeaderBlock();

    for (const row of dataRows) {
      const values = cols.map((_, i) => {
        const cell = row?.[i];
        if (cell == null || cell === "") return "";
        if (amountSet.has(i) && typeof cell === "number") return formatAmount(cell);
        return String(cell);
      });
      const rowHeight = measureRowHeight(doc, values, colWidths, amountSet, fontSize, false);
      ensureSpace(rowHeight, true);
      y = drawTableRow(doc, {
        y,
        values,
        colWidths,
        amountSet,
        fontSize,
        bold: false,
        fill: null,
        pageWidth,
      });
    }

    doc.end();
  });
}

function formatAmount(n) {
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function measureColumnWidths(headers, rows, pageWidth, amountSet) {
  const colCount = headers.length;
  if (colCount === 0) return [];
  const weights = headers.map((h, i) => {
    let max = String(h || "").length;
    for (let r = 0; r < Math.min(rows.length, 200); r++) {
      const cell = rows[r]?.[i];
      const len = String(cell == null ? "" : cell).length;
      if (len > max) max = len;
    }
    if (amountSet.has(i)) max = Math.max(max, 10);
    return Math.min(48, Math.max(6, max));
  });
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  return weights.map((w) => (w / total) * pageWidth);
}

function measureRowHeight(doc, values, colWidths, amountSet, fontSize, bold) {
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);
  const padY = 6;
  let maxH = fontSize + padY;
  for (let i = 0; i < colWidths.length; i++) {
    const text = String(values[i] ?? "");
    if (!text) continue;
    const textWidth = Math.max(4, colWidths[i] - 4);
    const h = doc.heightOfString(text, {
      width: textWidth,
      align: amountSet.has(i) ? "right" : "left",
    });
    maxH = Math.max(maxH, h + padY);
  }
  return maxH;
}

function drawTableRow(doc, { y, values, colWidths, amountSet, fontSize, bold, fill, pageWidth }) {
  const height = measureRowHeight(doc, values, colWidths, amountSet, fontSize, bold);
  const x0 = doc.page.margins.left;
  if (fill) {
    doc.save();
    doc.rect(x0, y, pageWidth, height).fill(fill);
    doc.restore();
  }
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize).fillColor("#111111");
  let x = x0;
  for (let i = 0; i < colWidths.length; i++) {
    const w = colWidths[i];
    const text = String(values[i] ?? "");
    const align = amountSet.has(i) ? "right" : "left";
    doc.text(text, x + 2, y + 3, {
      width: Math.max(4, w - 4),
      align,
      lineBreak: true,
      ellipsis: false,
    });
    x += w;
  }
  doc
    .strokeColor("#D1D5DB")
    .lineWidth(0.4)
    .moveTo(x0, y + height)
    .lineTo(x0 + pageWidth, y + height)
    .stroke();
  return y + height;
}
