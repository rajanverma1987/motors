import PDFDocument from "pdfkit";
import sharp from "sharp";
import { formatMoney } from "@/lib/format-currency";
import { formatDateForCurrency } from "@/lib/format-date";
import { logoDocumentSizeRem } from "@/lib/logo-document-scale";
import { computeTotalsFromLaborAndParts } from "@/lib/quote-invoice-totals";
import {
  poLineTaxAmount,
  poLineTotalWithTax,
  sumPoLineExtendedPreTax,
  sumPoLineTaxAmount,
  sumPoLineItemsTaxInclusive,
} from "@/lib/po-line-item-totals";
import { SERVICE_PROPOSAL_DOCUMENT_TITLE } from "@/lib/quote-document-labels";
import { readShopSettingsLogoFile } from "@/lib/shop-email-logo";

const PAGE = { width: 612, height: 792 };
const MARGIN = 48;
const CONTENT_W = PAGE.width - MARGIN * 2;
const BOTTOM = PAGE.height - 42;

function txt(v, max = 500) {
  return String(v ?? "").trim().slice(0, max);
}

export function safePdfFilename(prefix, label) {
  const base = String(label || prefix || "document")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${String(prefix || "document").slice(0, 40)}-${base || "document"}.pdf`;
}

export function pdfFileAttachment(filename, buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || !buffer.length) return null;
  return {
    filename: String(filename || "document.pdf").slice(0, 120),
    content: buffer,
    contentType: "application/pdf",
  };
}

export function mergeMailAttachments(...groups) {
  const out = [];
  for (const group of groups) {
    const list = Array.isArray(group) ? group : group ? [group] : [];
    for (const item of list) {
      if (item) out.push(item);
    }
  }
  return out;
}

async function logoPngBuffer(ownerEmail, logoUrl) {
  const file = readShopSettingsLogoFile(ownerEmail, logoUrl);
  if (!file?.buffer?.length) return null;
  try {
    return await sharp(file.buffer).png().toBuffer();
  } catch {
    return file.buffer;
  }
}

function money(value, currency) {
  return formatMoney(value, currency);
}

function dateLabel(value, currency) {
  const formatted = formatDateForCurrency(value, currency);
  return formatted && formatted !== "—" ? formatted : txt(value) || "—";
}

function collectPdf(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

async function finishPdf(doc, done) {
  doc.end();
  return done;
}

function ensureY(doc, y, needed) {
  if (y + needed <= BOTTOM) return y;
  doc.addPage();
  return MARGIN;
}

function drawWrapped(doc, text, x, y, width, { font = "Helvetica", size = 9, color = "#1c1917", align = "left" } = {}) {
  doc.font(font).fontSize(size).fillColor(color);
  doc.text(text || "—", x, y, { width, align });
  return doc.y;
}

function drawRule(doc, y) {
  doc.save();
  doc.strokeColor("#d6d3d1").lineWidth(0.6).moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).stroke();
  doc.restore();
  return y + 8;
}

function drawSectionTitle(doc, y, title) {
  y = ensureY(doc, y, 22);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#57534e").text(String(title || "").toUpperCase(), MARGIN, y);
  return doc.y + 6;
}

async function drawMasthead(doc, y, { title, shopName, shopContact, logoBuffer, logoScale }) {
  const { heightRem, maxWidthRem } = logoDocumentSizeRem(logoScale);
  const logoH = Math.max(28, Math.min(120, heightRem * 12));
  const logoW = Math.max(80, Math.min(CONTENT_W * 0.55, maxWidthRem * 12));
  let logoUsedH = 0;
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, MARGIN, y, { fit: [logoW, logoH], align: "left", valign: "top" });
      logoUsedH = logoH;
    } catch {
      logoUsedH = 0;
    }
  }
  const titleX = MARGIN + (logoUsedH ? logoW + 12 : 0);
  const titleW = CONTENT_W - (logoUsedH ? logoW + 12 : 0);
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#1c1917").text(title, titleX, y, {
    width: titleW,
    align: "right",
  });
  y = Math.max(y + logoUsedH, doc.y) + 8;
  y = drawRule(doc, y);
  if (shopName) {
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#1c1917").text(shopName, MARGIN, y, { width: CONTENT_W });
    y = doc.y + 2;
  }
  if (shopContact) {
    doc.font("Helvetica").fontSize(8).fillColor("#44403c").text(shopContact, MARGIN, y, { width: CONTENT_W });
    y = doc.y + 6;
  }
  return y;
}

function drawTwoCol(doc, y, leftTitle, leftBody, rightTitle, rightBody) {
  y = ensureY(doc, y, 48);
  const colW = (CONTENT_W - 16) / 2;
  const startY = y;
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#57534e").text(leftTitle, MARGIN, y);
  y = drawWrapped(doc, leftBody, MARGIN, doc.y + 2, colW, { size: 9 });
  const leftEnd = y;
  y = startY;
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#57534e").text(rightTitle, MARGIN + colW + 16, y);
  y = drawWrapped(doc, rightBody, MARGIN + colW + 16, doc.y + 2, colW, { size: 9 });
  return Math.max(leftEnd, y) + 10;
}

function drawInfoGrid(doc, y, items) {
  const rows = (items || []).filter((item) => item && (item.label || item.value));
  if (!rows.length) return y;
  y = ensureY(doc, y, 28);
  const cols = Math.min(3, rows.length);
  const colW = CONTENT_W / cols;
  let maxY = y;
  rows.forEach((item, i) => {
    const col = i % cols;
    if (col === 0 && i > 0) {
      y = maxY + 8;
      y = ensureY(doc, y, 28);
      maxY = y;
    }
    const x = MARGIN + col * colW;
    const rowY = col === 0 ? y : y;
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#1c1917").text(item.label, x, rowY, { width: colW - 8 });
    doc.font("Helvetica").fontSize(9).fillColor("#1c1917").text(item.value || "—", x, doc.y + 1, { width: colW - 8 });
    maxY = Math.max(maxY, doc.y);
  });
  return maxY + 10;
}

function drawTable(doc, y, headers, rows, widths) {
  if (!rows.length) return y;
  y = ensureY(doc, y, 36);
  const drawHeader = (atY) => {
    doc.save();
    doc.rect(MARGIN, atY, CONTENT_W, 18).fill("#1c1917");
    doc.restore();
    let x = MARGIN;
    headers.forEach((h, i) => {
      doc.font("Helvetica-Bold").fontSize(7).fillColor("#ffffff").text(h.label, x + 4, atY + 5, {
        width: widths[i] - 8,
        align: h.align || "left",
      });
      x += widths[i];
    });
    return atY + 18;
  };
  y = drawHeader(y);
  for (const row of rows) {
    const heights = headers.map((h, i) => {
      doc.font("Helvetica").fontSize(8);
      return doc.heightOfString(String(row[i] ?? "—"), { width: widths[i] - 8 });
    });
    const rowH = Math.max(16, ...heights) + 8;
    if (y + rowH > BOTTOM) {
      doc.addPage();
      y = drawHeader(MARGIN);
    }
    doc.save();
    doc.strokeColor("#e7e5e4").lineWidth(0.5).rect(MARGIN, y, CONTENT_W, rowH).stroke();
    doc.restore();
    let x = MARGIN;
    headers.forEach((h, i) => {
      doc.font("Helvetica").fontSize(8).fillColor("#1c1917").text(String(row[i] ?? "—"), x + 4, y + 4, {
        width: widths[i] - 8,
        align: h.align || "left",
      });
      x += widths[i];
    });
    y += rowH;
  }
  return y + 8;
}

function drawTotals(doc, y, lines, currency) {
  y = ensureY(doc, y, 20 + lines.length * 16);
  const boxW = 220;
  const x = MARGIN + CONTENT_W - boxW;
  for (let i = 0; i < lines.length; i += 1) {
    const row = lines[i];
    const isLast = i === lines.length - 1;
    if (isLast) {
      doc.save();
      doc.rect(x, y, boxW, 18).fill("#f5f5f4");
      doc.restore();
    }
    doc.font(isLast ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor("#1c1917");
    doc.text(row.label, x + 8, y + 4, { width: 110 });
    doc.text(money(row.value, currency), x + 118, y + 4, { width: 94, align: "right" });
    y += 18;
  }
  return y + 8;
}

function drawNotes(doc, y, title, notes) {
  const text = txt(notes, 4000);
  if (!text) return y;
  y = drawSectionTitle(doc, y, title);
  y = ensureY(doc, y, 40);
  return drawWrapped(doc, text, MARGIN, y, CONTENT_W, { size: 9 }) + 8;
}

/**
 * @param {{
 *   kind: "invoice" | "quote",
 *   doc: object,
 *   extras?: object,
 *   shopName?: string,
 *   ownerEmail?: string,
 *   settings?: object,
 * }} opts
 */
export async function buildQuoteInvoicePdfBuffer({
  kind,
  doc,
  extras = {},
  shopName = "",
  ownerEmail = "",
  settings = {},
}) {
  const q = doc && typeof doc === "object" ? doc : {};
  const currency = String(settings?.currency || "USD");
  const title = kind === "invoice" ? "Invoice" : SERVICE_PROPOSAL_DOCUMENT_TITLE;
  const logoBuffer = await logoPngBuffer(ownerEmail, extras.fromShopLogoUrl || settings?.logoUrl);
  const totals = computeTotalsFromLaborAndParts({
    laborTotal: q.laborTotal,
    partsTotal: q.partsTotal,
    taxExempt: q.customerTaxExempt,
    taxPercent: q.customerTaxPercent,
  });

  const pdf = new PDFDocument({ size: "LETTER", margin: MARGIN });
  const done = collectPdf(pdf);
  let y = MARGIN;
  y = await drawMasthead(pdf, y, {
    title,
    shopName: txt(extras.fromShopName || shopName),
    shopContact: txt(extras.fromShopContact),
    logoBuffer,
    logoScale: extras.logoDocumentScale ?? settings?.logoDocumentScale,
  });

  const billing = txt(extras.fromBillingAddress || settings?.accountsBillingAddress, 800);
  const shipping = txt(extras.fromShippingAddress || settings?.accountsShippingAddress, 800);
  const left = [
    extras.fromPaymentTermsLabel ? `Payment terms: ${extras.fromPaymentTermsLabel}` : "",
    billing ? `Billing:\n${billing}` : "",
    shipping && shipping !== billing ? `Shipping:\n${shipping}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const right = [txt(extras.customerToName), txt(extras.customerBillingAddress, 800)].filter(Boolean).join("\n");
  y = drawTwoCol(pdf, y, "From", left || "—", "To", right || "—");

  y = drawSectionTitle(pdf, y, kind === "invoice" ? "Invoice info" : `${SERVICE_PROPOSAL_DOCUMENT_TITLE} info`);
  y = drawInfoGrid(pdf, y, [
    kind === "invoice"
      ? { label: "Invoice#", value: txt(q.invoiceNumber) || "—" }
      : { label: `${SERVICE_PROPOSAL_DOCUMENT_TITLE}#`, value: txt(q.rfqNumber || q.invoiceNumber) || "—" },
    kind === "invoice" ? { label: `${SERVICE_PROPOSAL_DOCUMENT_TITLE}#`, value: txt(q.rfqNumber) || "—" } : null,
    { label: "Customer PO#", value: txt(q.customerPo) || "—" },
    kind === "invoice"
      ? { label: "Proposal Sent Date", value: dateLabel(q.proposalSubmitDate || q.date, currency) }
      : { label: "Proposal Date", value: dateLabel(q.date, currency) },
    kind === "invoice"
      ? { label: "Invoice Date", value: dateLabel(q.invoiceSubmitDate, currency) }
      : null,
    { label: "Prepared by", value: txt(q.preparedByDisplay || q.preparedBy) || "—" },
  ].filter(Boolean));

  const motorBits = [txt(q.motorIdentityLine), txt(q.motorSpecsLine), txt(q.motorDetailsLine), txt(q.motorType)]
    .filter(Boolean)
    .join("\n");
  if (motorBits || extras.motorLabel || q.motorLabel) {
    y = drawSectionTitle(pdf, y, "Motor");
    y = drawWrapped(pdf, motorBits || txt(extras.motorLabel || q.motorLabel), MARGIN, y, CONTENT_W, { size: 9 }) + 8;
  }

  const scopeLines = Array.isArray(q.scopeLines) ? q.scopeLines : [];
  if (scopeLines.length) {
    y = drawSectionTitle(pdf, y, "Scope");
    y = drawTable(
      pdf,
      y,
      [
        { label: "Scope" },
        { label: "Price", align: "right" },
      ],
      scopeLines.map((row) => [txt(row?.scope, 300) || "—", row?.price ? money(row.price, currency) : "—"]),
      [CONTENT_W - 90, 90]
    );
  }

  const partsLines = Array.isArray(q.partsLines) ? q.partsLines : [];
  if (partsLines.length) {
    y = drawSectionTitle(pdf, y, "Other cost");
    y = drawTable(
      pdf,
      y,
      [
        { label: "Item" },
        { label: "Qty", align: "right" },
        { label: "UOM" },
        { label: "Price", align: "right" },
        { label: "Total", align: "right" },
      ],
      partsLines.map((row) => {
        const qty = parseFloat(row?.qty ?? "1");
        const price = parseFloat(row?.price ?? "0");
        const lineTotal = Number.isFinite(qty) && Number.isFinite(price) ? qty * price : null;
        return [
          txt(row?.item, 240) || "—",
          txt(row?.qty) || "1",
          txt(row?.uom) || "—",
          row?.price ? money(row.price, currency) : "—",
          lineTotal != null ? money(lineTotal, currency) : "—",
        ];
      }),
      [CONTENT_W - 250, 40, 50, 80, 80]
    );
  }

  y = drawSectionTitle(pdf, y, "Totals");
  y = drawTotals(pdf, y, [
    { label: "Scope total", value: q.laborTotal },
    { label: "Other cost total", value: q.partsTotal },
    { label: "Subtotal", value: totals.subtotal },
    { label: "Tax", value: totals.taxAmount },
    { label: "Grand total", value: totals.grandTotal },
  ], currency);

  const notesText = txt(q.printNotesMode === "internal" ? q.notes : q.customerNotes, 4000);
  y = drawNotes(pdf, y, "Notes", notesText);
  y = drawNotes(pdf, y, "Payment options", extras.invoicePaymentOptions || settings?.invoicePaymentOptions);
  drawNotes(pdf, y, "", extras.invoiceThankYouNote || settings?.invoiceThankYouNote);

  return finishPdf(pdf, done);
}

/**
 * @param {{ po: object, vendor?: object, shopName?: string, ownerEmail?: string, settings?: object }} opts
 */
export async function buildPurchaseOrderPdfBuffer({ po, vendor = {}, shopName = "", ownerEmail = "", settings = {} }) {
  const p = po && typeof po === "object" ? po : {};
  const v = vendor && typeof vendor === "object" ? vendor : {};
  const currency = String(settings?.currency || "USD");
  const logoBuffer = await logoPngBuffer(ownerEmail, p.fromShopLogoUrl || settings?.logoUrl);
  const lines = Array.isArray(p.lineItems) ? p.lineItems : [];
  const otherChargesList = Array.isArray(p.otherCharges) ? p.otherCharges : [];
  const otherChargesTotal = otherChargesList.reduce((sum, row) => {
    const n = parseFloat(row?.amount ?? "0");
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const grandTotal = (sumPoLineItemsTaxInclusive(lines) || 0) + otherChargesTotal;

  const pdf = new PDFDocument({ size: "LETTER", margin: MARGIN });
  const done = collectPdf(pdf);
  let y = MARGIN;
  y = await drawMasthead(pdf, y, {
    title: p.poNumber ? `Purchase order ${p.poNumber}` : "Purchase order",
    shopName: txt(p.fromShopName || shopName),
    shopContact: txt(p.fromShopContact),
    logoBuffer,
    logoScale: p.logoDocumentScale ?? settings?.logoDocumentScale,
  });

  const billing = txt(p.fromAccountsBillingAddress || settings?.accountsBillingAddress, 800);
  const shipping = txt(p.fromAccountsShippingAddress || settings?.accountsShippingAddress, 800);
  const vendorLines = [
    txt(v.name || v.companyName || p.vendorName),
    txt(v.contactName),
    [txt(v.address), [txt(v.city), txt(v.state), txt(v.zipCode || v.zip)].filter(Boolean).join(", ")].filter(Boolean).join("\n"),
    [txt(v.phone), txt(v.email)].filter(Boolean).join(" | "),
    `NET Term: ${txt(v.paymentTerms || p.vendorPaymentTerms) || "NOT-SPECIFIED"}`,
  ]
    .filter(Boolean)
    .join("\n");
  const fromBody = [billing, shipping && shipping !== billing ? `Ship to:\n${shipping}` : ""].filter(Boolean).join("\n\n");
  y = drawTwoCol(pdf, y, "From", fromBody || "—", "Vendor", vendorLines || "—");

  y = drawSectionTitle(pdf, y, "Purchase order info");
  y = drawInfoGrid(pdf, y, [
    { label: "PO#", value: txt(p.poNumber) || "—" },
    { label: "Date", value: dateLabel(p.poCutDate || p.createdAt || p.formattedCreatedAt, currency) },
  ]);

  if (lines.length) {
    y = drawSectionTitle(pdf, y, "Line items");
    y = drawTable(
      pdf,
      y,
      [
        { label: "Description" },
        { label: "Qty", align: "right" },
        { label: "UOM" },
        { label: "Unit price", align: "right" },
        { label: "Tax %", align: "right" },
        { label: "Tax", align: "right" },
        { label: "Total", align: "right" },
      ],
      lines.map((row) => [
        txt(row?.description, 240) || "—",
        txt(row?.qty) || "—",
        txt(row?.uom) || "—",
        row?.unitPrice ? money(row.unitPrice, currency) : "—",
        txt(row?.taxPercent) || "0",
        poLineTaxAmount(row) != null ? money(poLineTaxAmount(row), currency) : "—",
        poLineTotalWithTax(row) != null ? money(poLineTotalWithTax(row), currency) : "—",
      ]),
      [CONTENT_W - 310, 36, 40, 70, 44, 60, 60]
    );
  }

  y = drawSectionTitle(pdf, y, "Totals");
  y = drawTotals(pdf, y, [
    { label: "Order total", value: sumPoLineExtendedPreTax(lines) },
    { label: "Total tax", value: sumPoLineTaxAmount(lines) },
    { label: "Grand total", value: grandTotal },
  ], currency);

  drawNotes(pdf, y, "Notes", p.notes || p.invoiceThankYouNote || settings?.invoiceThankYouNote);
  return finishPdf(pdf, done);
}

/**
 * @param {{
 *   entry: object,
 *   customerName?: string,
 *   companyName?: string,
 *   customerEmail?: string,
 *   customerPhone?: string,
 *   paidByLabel?: string,
 *   ownerEmail?: string,
 *   settings?: object,
 * }} opts
 */
export async function buildMotorShippingPdfBuffer({
  entry = {},
  customerName = "",
  companyName = "",
  customerEmail = "",
  customerPhone = "",
  paidByLabel = "",
  ownerEmail = "",
  settings = {},
}) {
  const e = entry && typeof entry === "object" ? entry : {};
  const currency = String(settings?.currency || "USD");
  const logoBuffer = await logoPngBuffer(ownerEmail, settings?.logoUrl);
  const pdf = new PDFDocument({ size: "LETTER", margin: MARGIN });
  const done = collectPdf(pdf);
  let y = MARGIN;
  y = await drawMasthead(pdf, y, {
    title: "Motor Shipping",
    shopName: txt(companyName),
    shopContact: "",
    logoBuffer,
    logoScale: settings?.logoDocumentScale,
  });
  y = drawSectionTitle(pdf, y, "Shipping details");
  y = drawInfoGrid(pdf, y, [
    { label: "Customer", value: txt(customerName) || "—" },
    { label: "Company", value: txt(companyName || customerName) || "—" },
    { label: "Phone", value: txt(customerPhone) || "—" },
    { label: "Email", value: txt(customerEmail) || "—" },
    { label: "Invoice #", value: txt(e.invoiceNumber) || "—" },
    { label: "Date", value: dateLabel(e.date, currency) },
    { label: "PO Number", value: txt(e.shippingPo) || "—" },
    { label: "Transport", value: txt(e.mannerOfTransport) || "—" },
    { label: "Freight", value: txt(e.freight) || "—" },
    { label: "Picked by", value: txt(e.pickedBy) || "—" },
    { label: "Charges", value: txt(e.charges) || "—" },
    { label: "Paid By", value: txt(paidByLabel || e.paidBy) || "—" },
  ]);
  drawNotes(pdf, y, "Notes", e.notes);
  return finishPdf(pdf, done);
}
