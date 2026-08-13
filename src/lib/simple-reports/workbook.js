import ExcelJS from "exceljs";

/**
 * Column letter for 1-based index (1 → A, 27 → AA).
 * @param {number} col
 */
function columnLetter(col) {
  let n = Math.max(1, Math.floor(Number(col) || 1));
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Headers that should get a filtered SUBTOTAL(109) at the top.
 * Skips rates/percents and non-money labels.
 * @param {string} header
 */
export function isReportAmountHeader(header) {
  const s = String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!s) return false;
  if (s.includes("%") || /\bpercent\b|\brate\b/.test(s)) return false;
  if (
    /\b(date|status|type|vendor|customer|company|name|sku|uom|location|bucket|person|job|invoice|city|state|email|phone|ein|contact|payment|receiving|low stock|days|method|#)\b/.test(
      s
    )
  ) {
    return false;
  }
  if (s === "tax" || s === "paid" || s === "unpaid") return true;
  return /\b(total|amount|ordered|received|scope|other items|credit limit|on hand|reserved|available|po count)\b/.test(
    s
  );
}

/**
 * Safe Excel table name (letters, digits, underscore; starts with letter).
 * @param {string} sheetName
 */
function tableNameFromSheet(sheetName) {
  const base = String(sheetName || "Report")
    .replace(/[^A-Za-z0-9]/g, "_")
    .replace(/^([^A-Za-z])/, "T$1")
    .slice(0, 40);
  return base || "ReportTable";
}

/**
 * Build a workbook with:
 *  - Row 1: SUBTOTAL(109, …) formulas for amount columns (updates when Autofilter is used)
 *  - Row 2+: Excel Table with filter buttons on every column
 *
 * @param {string} sheetName
 * @param {string[]} headers
 * @param {Array<Array<string|number|boolean|null|undefined>>} rows
 * @param {{ amountColumns?: number[] }} [options] — optional 0-based amount column indexes (overrides auto-detect)
 * @returns {Promise<Buffer>}
 */
export async function buildSimpleReportWorkbook(sheetName, headers, rows, options = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IQMotorBase Simple";
  workbook.created = new Date();

  const safeName =
    String(sheetName || "Report").replace(/[\\/*?:\[\]]/g, " ").slice(0, 31) || "Report";
  const sheet = workbook.addWorksheet(safeName);

  const cols = Array.isArray(headers) ? headers.map((h) => String(h ?? "")) : [];
  const dataRows = Array.isArray(rows) ? rows : [];
  const colCount = cols.length;
  if (colCount === 0) {
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  const amountCols =
    Array.isArray(options.amountColumns) && options.amountColumns.length > 0
      ? options.amountColumns.filter((i) => Number.isInteger(i) && i >= 0 && i < colCount)
      : cols.map((h, i) => (isReportAmountHeader(h) ? i : -1)).filter((i) => i >= 0);

  const amountSet = new Set(amountCols);

  // Row 1 — filtered subtotals (SUBTOTAL 109 = SUM of visible rows only)
  const subtotalValues = cols.map((_, i) => (i === 0 ? "Subtotal (filtered)" : ""));
  sheet.addRow(subtotalValues);
  const subtotalRow = sheet.getRow(1);
  subtotalRow.font = { bold: true };
  subtotalRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8EEF5" },
  };

  // Row 2 — table header
  sheet.addRow(cols);
  const headerRow = sheet.getRow(2);
  headerRow.font = { bold: true };

  // Rows 3+ — data
  for (const row of dataRows) {
    const values = cols.map((_, idx) => {
      const cell = row?.[idx];
      return cell == null ? "" : cell;
    });
    sheet.addRow(values);
  }

  const headerRowNum = 2;
  const firstDataRow = 3;
  const lastDataRow = dataRows.length > 0 ? firstDataRow + dataRows.length - 1 : headerRowNum;
  const lastColLetter = columnLetter(colCount);

  // SUBTOTAL formulas above the table (keep label in column A)
  for (const colIdx of amountSet) {
    if (colIdx === 0) continue;
    const letter = columnLetter(colIdx + 1);
    const cell = sheet.getCell(1, colIdx + 1);
    if (dataRows.length > 0) {
      cell.value = {
        formula: `SUBTOTAL(109,${letter}${firstDataRow}:${letter}${lastDataRow})`,
      };
    } else {
      cell.value = 0;
    }
    cell.numFmt = "#,##0.00";
    cell.font = { bold: true };
  }

  // Number format on amount data cells
  for (let r = 0; r < dataRows.length; r++) {
    for (const colIdx of amountSet) {
      const cell = sheet.getCell(firstDataRow + r, colIdx + 1);
      if (typeof cell.value === "number") {
        cell.numFmt = "#,##0.00";
      }
    }
  }

  // Excel Table → built-in AutoFilter on every column
  try {
    sheet.addTable({
      name: tableNameFromSheet(safeName),
      ref: `A${headerRowNum}:${lastColLetter}${lastDataRow}`,
      headerRow: true,
      totalsRow: false,
      style: {
        theme: "TableStyleMedium2",
        showRowStripes: true,
      },
      columns: cols.map((name, i) => ({
        name: String(name || `Column${i + 1}`).slice(0, 255) || `Column${i + 1}`,
        filterButton: true,
      })),
    });
  } catch {
    // Fallback if table creation fails (e.g. empty/duplicate name): plain AutoFilter
    sheet.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: lastDataRow, column: colCount },
    };
  }

  sheet.columns = cols.map((h, idx) => {
    let max = String(h || "").length;
    if (idx === 0) max = Math.max(max, "Subtotal (filtered)".length);
    for (const row of dataRows) {
      const len = String(row?.[idx] ?? "").length;
      if (len > max) max = len;
    }
    return { width: Math.min(48, Math.max(12, max + 2)) };
  });

  // Freeze header row (row 2); keep subtotal visible while scrolling
  sheet.views = [{ state: "frozen", ySplit: 2 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
