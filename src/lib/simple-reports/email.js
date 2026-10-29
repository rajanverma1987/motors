/**
 * HTML email body for Simple report "Send to customer" (Invoices / AR).
 * Renders invoices as an HTML table for email clients.
 */

import { escapeEmailHtml, withDashboardOutboundEmailFooter } from "@/lib/customer-facing-email-content";

function formatCell(value, isAmount) {
  if (value == null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return isAmount
      ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : String(value);
  }
  const s = String(value);
  if (isAmount) {
    const n = Number(String(s).replace(/,/g, ""));
    if (Number.isFinite(n)) {
      return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }
  return s;
}

function headerIndex(headers, name) {
  return headers.findIndex((h) => String(h || "").trim().toLowerCase() === name.toLowerCase());
}

/**
 * Optionally drop invoice rows that have no PO, and recompute amount totals.
 * @param {{
 *   headers?: string[],
 *   rows?: unknown[][],
 *   amountColumns?: number[],
 *   amountTotals?: Array<number|null>,
 *   rowCount?: number,
 * }} result
 * @param {boolean} includeWithoutPo
 */
export function filterInvoicesArRowsForEmail(result, includeWithoutPo) {
  const headers = Array.isArray(result?.headers) ? result.headers : [];
  const rows = Array.isArray(result?.rows) ? result.rows : [];
  const amountColumns = Array.isArray(result?.amountColumns) ? result.amountColumns : [];
  const idxPo = headerIndex(headers, "PO");

  const filtered =
    includeWithoutPo || idxPo < 0
      ? rows
      : rows.filter((row) => String(row?.[idxPo] ?? "").trim() !== "");

  const amountTotals = new Array(headers.length).fill(null);
  for (const colIdx of amountColumns) {
    if (!Number.isInteger(colIdx) || colIdx < 0 || colIdx >= headers.length) continue;
    let sum = 0;
    for (const row of filtered) {
      const n = Number(row?.[colIdx]);
      if (Number.isFinite(n)) sum += n;
    }
    amountTotals[colIdx] = sum;
  }

  return {
    ...result,
    headers,
    rows: filtered,
    amountColumns,
    amountTotals,
    rowCount: filtered.length,
  };
}

function th(label, { align = "left" } = {}) {
  return `<th style="padding:8px 10px;border:1px solid #d1d5db;background:#f3f4f6;font-size:12px;font-weight:700;text-align:${align};color:#111827;white-space:nowrap">${escapeEmailHtml(
    label
  )}</th>`;
}

function td(value, { align = "left", strong = false } = {}) {
  const text = escapeEmailHtml(String(value || "").trim() || "-");
  const weight = strong ? "font-weight:700;" : "";
  return `<td style="padding:8px 10px;border:1px solid #e5e7eb;font-size:13px;line-height:1.4;text-align:${align};color:#111827;${weight}">${text}</td>`;
}

/**
 * @param {{
 *   title?: string,
 *   customerName?: string,
 *   shopCompanyName?: string,
 *   headers: string[],
 *   rows: unknown[][],
 *   amountColumns?: number[],
 *   amountTotals?: Array<number|null>,
 *   customMessage?: string,
 * }} opts
 */
export function buildSimpleReportCustomerEmailHtml(opts) {
  const title = String(opts.title || "Invoices / AR").trim() || "Invoices / AR";
  const customerName = String(opts.customerName || "").trim();
  const shopName =
    String(opts.shopCompanyName || "").trim() || "Electric Motor Shop";
  const headers = Array.isArray(opts.headers) ? opts.headers : [];
  const rows = Array.isArray(opts.rows) ? opts.rows : [];
  const amountTotals = Array.isArray(opts.amountTotals) ? opts.amountTotals : [];
  const customMessage = String(opts.customMessage || "").trim();

  const idxInvoice = headerIndex(headers, "Invoice #");
  const idxPo = headerIndex(headers, "PO");
  const idxCustomer = headerIndex(headers, "Customer");
  const idxPayStatus = headerIndex(headers, "Payment status");
  const idxDue = headerIndex(headers, "Due date");
  const idxPaidDate = headerIndex(headers, "Invoice paid date");
  const idxGrand = headerIndex(headers, "Grand total");
  const idxPaid = headerIndex(headers, "Paid");
  const idxUnpaid = headerIndex(headers, "Unpaid");

  const customBlock = customMessage
    ? customMessage
        .split(/\r?\n/)
        .map((line) => {
          const inner = escapeEmailHtml(line);
          return `<p style="margin:0 0 8px;font-size:14px;line-height:1.45;color:#1f2937">${inner || "&nbsp;"}</p>`;
        })
        .join("")
    : "";

  const bodyRows = rows
    .map((row, i) => {
      const invoiceNo = formatCell(row?.[idxInvoice], false) || `Invoice ${i + 1}`;
      const po = formatCell(row?.[idxPo], false);
      const customer = formatCell(row?.[idxCustomer], false);
      const payStatus = formatCell(row?.[idxPayStatus], false);
      const due = formatCell(row?.[idxDue], false);
      const paidDate = formatCell(row?.[idxPaidDate], false);
      const grand = formatCell(row?.[idxGrand], true);
      const paid = formatCell(row?.[idxPaid], true);
      const unpaid = formatCell(row?.[idxUnpaid], true);
      const bg = i % 2 === 1 ? "background:#fafafa;" : "background:#ffffff;";

      return `<tr style="${bg}">
        ${td(invoiceNo)}
        ${td(po)}
        ${td(customer)}
        ${td(payStatus)}
        ${td(due)}
        ${td(paidDate)}
        ${td(grand, { align: "right", strong: true })}
        ${td(paid, { align: "right" })}
        ${td(unpaid, { align: "right", strong: true })}
      </tr>`;
    })
    .join("");

  const totalsRow =
    rows.length > 0
      ? `<tr style="background:#faf6f2">
          <td colspan="6" style="padding:8px 10px;border:1px solid #d1d5db;font-size:13px;font-weight:700;color:#9a5d33;text-align:right">Grand totals</td>
          ${td(formatCell(amountTotals[idxGrand] ?? 0, true), { align: "right", strong: true })}
          ${td(formatCell(amountTotals[idxPaid] ?? 0, true), { align: "right", strong: true })}
          ${td(formatCell(amountTotals[idxUnpaid] ?? 0, true), { align: "right", strong: true })}
        </tr>`
      : "";

  const tableBlock =
    rows.length > 0
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;width:100%;max-width:100%;margin:0 0 8px">
          <thead>
            <tr>
              ${th("Invoice #")}
              ${th("PO")}
              ${th("Customer")}
              ${th("Payment status")}
              ${th("Due date")}
              ${th("Paid date")}
              ${th("Grand total", { align: "right" })}
              ${th("Paid", { align: "right" })}
              ${th("Unpaid", { align: "right" })}
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
            ${totalsRow}
          </tbody>
        </table>`
      : `<p style="margin:0 0 14px;font-size:14px;color:#6b7280">No invoices in this report.</p>`;

  const html = withDashboardOutboundEmailFooter(`
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;max-width:960px">
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5">
        Please find your accounts receivable summary from <strong>${escapeEmailHtml(shopName)}</strong> below.
      </p>
      ${customBlock}
      <p style="margin:0 0 14px;font-size:13px;color:#4b5563">
        ${rows.length} invoice${rows.length === 1 ? "" : "s"}
      </p>
      ${tableBlock}
      <p style="margin:20px 0 0;font-size:14px;line-height:1.5;color:#1f2937">
        If you have questions about any balance, reply to this email and we will help.
      </p>
      <p style="margin:16px 0 0;font-size:14px;color:#1f2937">Thank you,<br/><strong>${escapeEmailHtml(
        shopName
      )}</strong></p>
    </div>
  `);

  const subjectCustomer = customerName ? ` for ${customerName}` : "";
  const subject = `${title}${subjectCustomer} · ${shopName}`;

  return { subject, html };
}
