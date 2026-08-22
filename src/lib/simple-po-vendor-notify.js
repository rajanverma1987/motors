import { isPoLineInactive } from "@/lib/simple-purchase-order-form";

function esc(v) {
  return v == null
    ? ""
    : String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * @param {Array<{ itemName?: string, quantity?: string, uom?: string }>} lines
 */
export function buildCancelledLinesHtml(lines) {
  const items = (Array.isArray(lines) ? lines : []).filter((l) =>
    String(l?.itemName || "").trim()
  );
  if (!items.length) return "";
  const rows = items
    .map(
      (l) =>
        `<li>${esc(l.itemName)} — Qty ${esc(String(l.quantity ?? "0"))}${l.uom ? ` ${esc(l.uom)}` : ""}</li>`
    )
    .join("");
  return `<p><strong>Cancelled items:</strong></p><ul style="margin:8px 0;padding-left:20px">${rows}</ul>`;
}

/**
 * @param {object} po
 * @returns {object} form-like object with only active line items
 */
export function poFormWithActiveLinesOnly(po) {
  if (!po || typeof po !== "object") return po;
  const lineItems = (Array.isArray(po.lineItems) ? po.lineItems : []).filter(
    (line) => !isPoLineInactive(line)
  );
  return { ...po, lineItems };
}

/**
 * @param {{
 *   shopCompanyName?: string,
 *   poNumber?: string,
 *   toName?: string,
 *   reason?: string,
 *   customMessage?: string,
 *   cancelledLines?: object[],
 *   entirePo?: boolean,
 *   revisedPo?: object | null,
 *   addressesHtml?: string,
 *   logoHtml?: string,
 * }} opts
 */
export function buildPoCancellationVendorEmailHtml(opts = {}) {
  const shop = esc(opts.shopCompanyName || "Our shop");
  const poNumber = esc(opts.poNumber || "");
  const hi = opts.toName ? `Hi ${esc(opts.toName)},` : "Hi,";
  const reason = String(opts.reason || "").trim();
  const custom = String(opts.customMessage || "").trim();
  const cancelledHtml = buildCancelledLinesHtml(opts.cancelledLines || []);

  let body = "";
  if (opts.entirePo) {
    body = `<p>Please note that purchase order <strong>PO# ${poNumber}</strong> has been <strong>cancelled</strong>.</p>`;
  } else {
    body = `<p>Please note the following update to purchase order <strong>PO# ${poNumber}</strong>.</p>`;
    if (cancelledHtml) body += cancelledHtml;
    if (opts.revisedPo) {
      body += `<p>A revised purchase order PDF with the remaining active line items and updated totals is attached.</p>`;
    }
  }

  if (reason) {
    body += `<p><strong>Reason:</strong> ${esc(reason)}</p>`;
  }
  if (custom) {
    body += `<p style="white-space:pre-wrap;margin:12px 0">${esc(custom)}</p>`;
  }

  return `
    <p>${hi}</p>
    ${body}
    <p>If you have questions, reply to this email or contact us.</p>
    ${opts.addressesHtml || ""}
    ${opts.logoHtml || ""}
    <p style="margin-top:16px">— ${shop}</p>
  `;
}

/**
 * @param {{ entirePo?: boolean, poNumber?: string, shopCompanyName?: string }} opts
 */
export function buildPoCancellationVendorEmailSubject(opts = {}) {
  const po = String(opts.poNumber || "").trim();
  const shop = String(opts.shopCompanyName || "Motor Shop").trim();
  if (opts.entirePo) {
    return `Purchase order ${po ? `${po} ` : ""}cancelled – ${shop}`;
  }
  return `Purchase order ${po ? `${po} ` : ""}update – items cancelled – ${shop}`;
}
