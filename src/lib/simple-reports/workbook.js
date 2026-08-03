import ExcelJS from "exceljs";

/**
 * @param {string} sheetName
 * @param {string[]} headers
 * @param {Array<Array<string|number|boolean|null|undefined>>} rows
 * @returns {Promise<Buffer>}
 */
export async function buildSimpleReportWorkbook(sheetName, headers, rows) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IQMotorBase Simple";
  workbook.created = new Date();

  const safeName = String(sheetName || "Report").replace(/[\\/*?:\[\]]/g, " ").slice(0, 31) || "Report";
  const sheet = workbook.addWorksheet(safeName);

  sheet.addRow(headers);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.commit();

  for (const row of rows) {
    sheet.addRow(row.map((cell) => (cell == null ? "" : cell)));
  }

  sheet.columns = headers.map((h, idx) => {
    let max = String(h || "").length;
    for (const row of rows) {
      const len = String(row?.[idx] ?? "").length;
      if (len > max) max = len;
    }
    return { width: Math.min(48, Math.max(12, max + 2)) };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
