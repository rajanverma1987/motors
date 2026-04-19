import { PDFDocument, StandardFonts } from "pdf-lib";

function wrapText(str, maxChars) {
  const words = String(str || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars) {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars) : w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

/**
 * One-page PDF summary for RFQ / customer records (UTF-8 ASCII-safe lines).
 * @param {{ form: Record<string, string>, breakdown: Record<string, unknown> }} payload
 * @returns {Promise<Buffer>}
 */
export async function buildRewindCalculatorPdfBuffer(payload) {
  const { form = {}, breakdown = {} } = payload || {};
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const size = 10;
  const lineGap = 13;
  let y = 760;

  const draw = (text, opts = {}) => {
    const f = opts.bold ? fontBold : font;
    const s = opts.size || size;
    const lines = wrapText(text, 88);
    for (const line of lines) {
      if (y < 48) return;
      page.drawText(line, { x: 48, y, size: s, font: f });
      y -= lineGap;
    }
  };

  draw("MotorsWinding.com — Motor rewinding ballpark estimate", { bold: true, size: 14 });
  y -= 4;
  draw(`Generated: ${new Date().toISOString().slice(0, 19)}Z`, { size: 9 });
  y -= 8;

  const rating = form.ratingUnit === "kw" ? `${form.kw || "—"} kW` : `${form.hp || "—"} HP`;
  draw("Motor inputs (from visitor)", { bold: true });
  draw(`Rating: ${rating} (equiv. ~${breakdown.motorHp ?? "—"} HP)`);
  draw(`Phase: ${form.phase === "1" ? "Single-phase" : "Three-phase"} | Voltage: ${form.voltage || "—"} V | RPM: ${form.rpm || "—"}`);
  draw(`Slots: ${form.slots || "—"} | Wire: AWG ${form.wireGauge || "—"} | Coil: ${form.coilType || "—"}`);
  y -= 6;
  draw("Ballpark breakdown (USD)", { bold: true });
  draw(`Estimated copper & wire: $${breakdown.copperCost ?? "—"}`);
  draw(`Insulation / varnish allowance: $${breakdown.materialCost ?? "—"}`);
  draw(`Typical shop labor (HP band): $${breakdown.laborUsd ?? "—"}`);
  y -= 4;
  draw(`Estimated total (ballpark): $${breakdown.ballparkTotal ?? "—"}`, { bold: true, size: 12 });
  y -= 10;
  draw(
    "This is a non-binding educational estimate. Final price depends on inspection, damage, rush, and shop rates.",
    { size: 9 },
  );

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
