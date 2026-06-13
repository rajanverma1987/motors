import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { BRAND_LOGO_PUBLIC_PATH } from "@/lib/brand-logo";
import { calculatorFormRows, visitorTypeLabel } from "@/lib/motor-rewind-cost/form-display";
import { formatUsd } from "@/lib/motor-rewind-cost/customer-estimate-display";

const LOGO_PATH = path.join(process.cwd(), "public", BRAND_LOGO_PUBLIC_PATH.replace(/^\//, ""));

const PAGE = { width: 612, height: 792 };
const MARGIN = 48;
const CONTENT_W = PAGE.width - MARGIN * 2;

const BRAND = {
  primary: "#8B5E34",
  primaryDark: "#6B4528",
  primaryTint: "#F6F0E8",
  primaryBorder: "#D4B896",
  text: "#1C1917",
  muted: "#57534E",
  border: "#E7E5E4",
  white: "#FFFFFF",
  success: "#166534",
  successBg: "#ECFDF3",
  warning: "#92400E",
  warningBg: "#FFFBEB",
};

function getLogoPath() {
  try {
    if (fs.existsSync(LOGO_PATH)) return LOGO_PATH;
  } catch {
    /* ignore */
  }
  return null;
}

function ensureSpace(doc, y, needed, { repeatMiniHeader = false } = {}) {
  const bottom = PAGE.height - MARGIN - 36;
  if (y + needed <= bottom) return y;
  doc.addPage();
  return repeatMiniHeader ? drawMiniHeader(doc, MARGIN) : MARGIN;
}

function drawMiniHeader(doc, y) {
  doc.save();
  doc.rect(MARGIN, y, CONTENT_W, 3).fill(BRAND.primary);
  doc.restore();
  return y + 14;
}

function drawDocumentHeader(doc, generatedAt) {
  let y = MARGIN;
  const logoPath = getLogoPath();

  if (logoPath) {
    const logoW = 200;
    const logoX = MARGIN + (CONTENT_W - logoW) / 2;
    doc.image(logoPath, logoX, y, { width: logoW });
    y += 30;
  } else {
    doc.font("Helvetica-Bold").fontSize(18).fillColor(BRAND.primary).text("IQMotorBase.com", MARGIN, y, {
      width: CONTENT_W,
      align: "center",
    });
    y = doc.y + 8;
  }

  doc.save();
  doc.roundedRect(MARGIN, y, CONTENT_W, 52, 6).fill(BRAND.primary);
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(16).fillColor(BRAND.white).text("Motor Rewind Cost Estimate", MARGIN, y + 12, {
    width: CONTENT_W,
    align: "center",
  });
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#F5EDE4")
    .text("US ballpark planning range · not a binding shop quote", MARGIN, y + 32, {
      width: CONTENT_W,
      align: "center",
    });

  y += 64;
  doc.fillColor(BRAND.muted).font("Helvetica").fontSize(8).text(`Generated ${generatedAt}`, MARGIN, y, {
    width: CONTENT_W,
    align: "right",
  });
  doc.fillColor(BRAND.text);
  return y + 18;
}

function drawSectionTitle(doc, title, y) {
  y = ensureSpace(doc, y, 28);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(BRAND.primaryDark).text(title.toUpperCase(), MARGIN, y, {
    width: CONTENT_W,
    characterSpacing: 0.4,
  });
  const lineY = doc.y + 4;
  doc.save();
  doc.moveTo(MARGIN, lineY).lineTo(MARGIN + CONTENT_W, lineY).lineWidth(0.5).strokeColor(BRAND.border).stroke();
  doc.restore();
  return lineY + 10;
}

function drawKeyValueTable(doc, rows, y) {
  if (!rows.length) return y;
  const labelW = CONTENT_W * 0.42;
  const valueW = CONTENT_W - labelW;
  const paddingX = 12;
  const rowPad = 6;

  const measured = rows.map((row) => {
    doc.font("Helvetica").fontSize(9);
    const labelH = doc.heightOfString(String(row.label), { width: labelW - paddingX - 4 });
    doc.font("Helvetica-Bold").fontSize(9);
    const valueH = doc.heightOfString(String(row.value ?? "—"), { width: valueW - paddingX - 4 });
    const rowH = Math.max(labelH, valueH) + rowPad * 2;
    return { ...row, rowH };
  });

  const tableH = measured.reduce((sum, row) => sum + row.rowH, 0) + 8;
  y = ensureSpace(doc, y, tableH + 8);

  doc.save();
  doc.roundedRect(MARGIN, y, CONTENT_W, tableH, 4).fill(BRAND.white).stroke(BRAND.border);
  doc.restore();

  let rowY = y + 4;
  measured.forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.save();
      doc.rect(MARGIN + 1, rowY, CONTENT_W - 2, row.rowH).fill(BRAND.primaryTint);
      doc.restore();
    }
    doc.font("Helvetica").fontSize(9).fillColor(BRAND.muted).text(String(row.label), MARGIN + paddingX, rowY + rowPad, {
      width: labelW - paddingX - 4,
    });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(BRAND.text).text(String(row.value ?? "—"), MARGIN + labelW, rowY + rowPad, {
      width: valueW - paddingX - 4,
    });
    rowY += row.rowH;
  });

  return y + tableH + 14;
}

function drawEstimateHighlight(doc, est, y) {
  const boxH = 88;
  y = ensureSpace(doc, y, boxH + 12);

  doc.save();
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 6).fill(BRAND.primaryTint);
  doc.roundedRect(MARGIN, y, 5, boxH, 2).fill(BRAND.primary);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 6).lineWidth(1).strokeColor(BRAND.primaryBorder).stroke();
  doc.restore();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(BRAND.primaryDark)
    .text("BALLPARK ESTIMATE (US)", MARGIN + 16, y + 14, { width: CONTENT_W - 32 });

  doc
    .font("Helvetica-Bold")
    .fontSize(26)
    .fillColor(BRAND.primary)
    .text(
      `${formatUsd(est.roughLow, { whole: true })} – ${formatUsd(est.roughHigh, { whole: true })}`,
      MARGIN + 16,
      y + 30,
      { width: CONTENT_W - 32 }
    );

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(BRAND.muted)
    .text(
      "Planning range based on typical US rewind shop pricing. Final price depends on inspection, damage, varnish/VPI, bearings, and shop rates.",
      MARGIN + 16,
      y + 62,
      { width: CONTENT_W - 32 }
    );

  doc.fillColor(BRAND.text);
  return y + boxH + 16;
}

function drawGuidanceBox(doc, est, y) {
  const isReplace = !!est.replacementRecommended;
  const bg = isReplace ? BRAND.warningBg : BRAND.successBg;
  const accent = isReplace ? BRAND.warning : BRAND.success;
  const title = isReplace ? "Compare rewind vs replace" : "Rewind looks cost-effective";
  const body = isReplace
    ? "At this ballpark, compare rewind vs new motor quotes using written shop quotes—not online benchmarks alone."
    : "At this range, rewinding is typically under ~60% of a generic new-motor benchmark. Still confirm with shop quotes after inspection.";

  const boxH = 52;
  y = ensureSpace(doc, y, boxH + 10);

  doc.save();
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 4).fill(bg);
  doc.roundedRect(MARGIN, y, 4, boxH, 2).fill(accent);
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(10).fillColor(accent).text(title, MARGIN + 14, y + 10, {
    width: CONTENT_W - 28,
  });
  doc.font("Helvetica").fontSize(9).fillColor(BRAND.text).text(body, MARGIN + 14, y + 26, {
    width: CONTENT_W - 28,
  });
  doc.fillColor(BRAND.text);
  return y + boxH + 14;
}

function drawCostBreakdown(doc, breakdown, y) {
  const items = [
    { label: "Copper / wire", value: formatUsd(breakdown.copperCost), pct: breakdown.copperCost },
    { label: "Insulation / varnish", value: formatUsd(breakdown.materialCost), pct: breakdown.materialCost },
    { label: "Labor band", value: formatUsd(breakdown.laborUsd), pct: breakdown.laborUsd },
  ];
  const total = Number(breakdown.ballparkTotal) || 1;
  const barW = CONTENT_W - 160;
  const rowH = 22;
  const tableH = rowH * items.length + 36;
  y = ensureSpace(doc, y, tableH + 8);

  doc.save();
  doc.roundedRect(MARGIN, y, CONTENT_W, tableH, 4).fill(BRAND.white).stroke(BRAND.border);
  doc.restore();

  let rowY = y + 12;
  items.forEach((item) => {
    const pct = Math.min(100, Math.max(4, Math.round((Number(item.pct) / total) * 100)));
    doc.font("Helvetica").fontSize(9).fillColor(BRAND.muted).text(item.label, MARGIN + 12, rowY + 2, {
      width: 110,
    });
    doc.save();
    doc.roundedRect(MARGIN + 124, rowY + 4, barW, 8, 2).fill("#EDE9E4");
    doc.roundedRect(MARGIN + 124, rowY + 4, (barW * pct) / 100, 8, 2).fill(BRAND.primaryBorder);
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(BRAND.text).text(item.value, MARGIN + 124 + barW + 8, rowY + 2, {
      width: 56,
      align: "right",
    });
    rowY += rowH;
  });

  doc.save();
  doc.moveTo(MARGIN + 12, rowY + 4).lineTo(MARGIN + CONTENT_W - 12, rowY + 4).lineWidth(0.5).strokeColor(BRAND.border).stroke();
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(10).fillColor(BRAND.primaryDark).text("Point estimate (mid model)", MARGIN + 12, rowY + 12, {
    width: CONTENT_W * 0.6,
  });
  doc.font("Helvetica-Bold").fontSize(11).fillColor(BRAND.primary).text(formatUsd(breakdown.ballparkTotal), MARGIN + 12, rowY + 12, {
    width: CONTENT_W - 24,
    align: "right",
  });

  return y + tableH + 14;
}

function measureTextHeight(doc, text, width, fontSize = 9) {
  doc.font("Helvetica").fontSize(fontSize);
  return doc.heightOfString(String(text || ""), { width });
}

function drawNoteBox(doc, title, text, y, variant = "default") {
  const bg = variant === "warning" ? BRAND.warningBg : BRAND.primaryTint;
  const accent = variant === "warning" ? BRAND.warning : BRAND.primary;
  const bodyH = measureTextHeight(doc, text, CONTENT_W - 28);
  const boxH = bodyH + 28;
  y = ensureSpace(doc, y, boxH + 8);

  doc.save();
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 4).fill(bg);
  doc.roundedRect(MARGIN, y, 4, boxH, 2).fill(accent);
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(9).fillColor(accent).text(title, MARGIN + 14, y + 8, { width: CONTENT_W - 28 });
  doc.font("Helvetica").fontSize(9).fillColor(BRAND.text).text(text, MARGIN + 14, y + 22, { width: CONTENT_W - 28 });
  return y + boxH + 12;
}

function drawBulletSection(doc, title, paragraphs, y) {
  y = drawSectionTitle(doc, title, y);
  const items = (paragraphs || []).map((t) => String(t || "").trim()).filter(Boolean);
  if (!items.length) return y;

  const body = items.map((line) => `•  ${line}`).join("\n\n");
  const bodyH = measureTextHeight(doc, body, CONTENT_W - 8) + 16;
  y = ensureSpace(doc, y, bodyH, { repeatMiniHeader: true });

  doc.save();
  doc.roundedRect(MARGIN, y, CONTENT_W, bodyH, 4).fill(BRAND.white).stroke(BRAND.border);
  doc.restore();

  doc.font("Helvetica").fontSize(9).fillColor(BRAND.text).text(body, MARGIN + 12, y + 10, {
    width: CONTENT_W - 24,
    lineGap: 2,
  });

  return y + bodyH + 14;
}

/**
 * @param {object} data
 * @param {{ name: string, email: string, phone: string, visitorType: string }} data.visitor
 * @param {Record<string, string>} data.form
 * @param {ReturnType<import("@/lib/motor-rewind-cost/customer-estimate-display").buildCustomerEstimateDisplay>} data.estimate
 * @param {string} [data.sourcePage]
 */
export function buildCalculatorEstimatePdfBuffer(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: "LETTER" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const visitor = data.visitor || {};
    const form = data.form || {};
    const est = data.estimate || {};
    const breakdown = est.breakdown || {};
    const generatedAt = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    let y = drawDocumentHeader(doc, generatedAt);

    y = drawSectionTitle(doc, "Your information", y);
    y = drawKeyValueTable(doc, [
      { label: "Name", value: visitor.name },
      { label: "Email", value: visitor.email },
      { label: "Phone", value: visitor.phone || "—" },
      { label: "Visitor type", value: visitorTypeLabel(visitor.visitorType) },
    ], y);

    y = drawSectionTitle(doc, "Motor configuration", y);
    y = drawKeyValueTable(doc, calculatorFormRows(form), y);

    y = drawEstimateHighlight(doc, est, y);
    y = drawGuidanceBox(doc, est, y);

    if (est.fractionalHpNote) {
      y = drawNoteBox(
        doc,
        "Fractional-HP note",
        "Many shops charge a minimum bench fee on fractional-HP motors—the total often reflects minimum labor more than copper alone.",
        y
      );
    }

    if (est.industrial) {
      y = drawNoteBox(
        doc,
        "Industrial motor",
        "Pricing is usually custom for large industrial motors—use a formal quote after inspection.",
        y,
        "warning"
      );
    }

    y = drawSectionTitle(doc, "Typical cost components", y);
    y = drawCostBreakdown(doc, breakdown, y);

    if (est.newMotorEstimate != null) {
      y = drawNoteBox(
        doc,
        "Replacement benchmark (planning only)",
        `Generic new motor benchmark ~${formatUsd(est.newMotorEstimate, { whole: true })}${est.motorLive ? " (index-adjusted)" : ""}. Your planning band midpoint ~${formatUsd((est.roughLow + est.roughHigh) / 2, { whole: true })}.`,
        y
      );
    }

    y = drawSectionTitle(doc, "Market inputs", y);
    const marketRows = [
      {
        label: "Copper rate (model)",
        value: `${formatUsd(est.copperUsdPerKg)}/kg${est.copperLive ? " · live" : " · reference"}`,
      },
      {
        label: "New-motor index factor",
        value: `×${Number(est.motorPpiMultiplier || 1).toFixed(2)}${est.motorLive ? " · live" : " · baseline"}`,
      },
    ];
    if (est.marketFetchedAt) {
      marketRows.push({ label: "Market snapshot", value: est.marketFetchedAt });
    }
    y = drawKeyValueTable(doc, marketRows, y);

    const methodology = [
      "This calculator uses periodically refreshed public benchmarks (commodity copper and motor-industry producer prices) to tune material input and the generic new-motor comparison.",
      "If live data is unavailable for a given refresh, fixed reference values are used instead.",
      "Copper materials may use IMF copper benchmark via FRED (USD/kg), with a wire-purchasing adjustment factor.",
      "New-motor comparison may use the U.S. producer price index for motor & generator manufacturing vs a configured baseline index (also via FRED).",
      "Labor is modeled as a slab band by motor size; insulation and varnish use a fixed shop-style allowance unless otherwise specified.",
      "This document is planning guidance only—not a shop quote, warranty, or offer to perform work.",
    ];
    if (est.copperLive && est.copperSourceLabel) methodology.push(est.copperSourceLabel);
    if (est.motorLive && est.motorSourceLabel) methodology.push(est.motorSourceLabel);

    y = drawBulletSection(doc, "How this estimate is calculated", methodology, y);

    if (data.sourcePage) {
      y = drawNoteBox(doc, "Source", `Calculator page: ${data.sourcePage}`, y);
    }

    y = ensureSpace(doc, y, 70, { repeatMiniHeader: true });
    const disclaimerText =
      "IQMotorBase.com provides informational ballpark ranges to help plan motor repair and rewinding budgets. Always obtain written quotes from qualified motor repair shops after inspection. Visit iqmotorbase.com to compare shops and request quotes.";
    const disclaimerH = measureTextHeight(doc, disclaimerText, CONTENT_W - 28, 8) + 36;
    y = ensureSpace(doc, y, disclaimerH, { repeatMiniHeader: true });
    doc.save();
    doc.roundedRect(MARGIN, y, CONTENT_W, disclaimerH, 4).fill("#FAFAF9").stroke(BRAND.border);
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(BRAND.muted).text("DISCLAIMER", MARGIN + 14, y + 10, {
      width: CONTENT_W - 28,
      lineBreak: false,
    });
    doc.font("Helvetica").fontSize(8).fillColor(BRAND.muted).text(disclaimerText, MARGIN + 14, y + 22, {
      width: CONTENT_W - 28,
      lineGap: 1,
    });

    doc.end();
  });
}
