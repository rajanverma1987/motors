import QRCode from "qrcode";

/**
 * @typedef {Object} MotorTagPrintOptions
 * @property {string} [customerName]
 * @property {Record<string, unknown>} [motor] - motor asset fields (serialNumber, manufacturer, model, hp, …)
 * @property {string} [motorFallbackLine] - one-line summary if full motor object missing
 */

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function motorRows(motor) {
  if (!motor || typeof motor !== "object") return [];
  const rows = [];
  const push = (label, val) => {
    const v = val != null && String(val).trim() !== "" ? String(val).trim() : "";
    if (v) rows.push([label, v]);
  };
  push("Serial #", motor.serialNumber);
  push("Manufacturer", motor.manufacturer);
  push("Model", motor.model);
  push("Frame", motor.frameSize);
  push("Type", motor.motorType);
  const hp = motor.hp ? `${motor.hp} HP` : "";
  const vRaw = motor.voltage != null ? String(motor.voltage).trim() : "";
  const volts = vRaw ? (/v/i.test(vRaw) ? vRaw : `${vRaw} V`) : "";
  const rpm = motor.rpm ? `${motor.rpm} RPM` : "";
  const spec = [hp, volts, rpm].filter(Boolean).join(" · ");
  if (spec) rows.push(["Ratings", spec]);
  return rows;
}

/**
 * Print sheet: QR encodes quote # (RFQ). Technician app scans → opens WO for this quote.
 * @param {string} rfqNumber
 * @param {MotorTagPrintOptions} [options]
 */
export async function printQuoteMotorTagQr(rfqNumber, options = {}) {
  const code = String(rfqNumber ?? "").trim();
  if (!code) return false;

  const customerName = String(options.customerName ?? "").trim();
  const motor = options.motor && typeof options.motor === "object" ? options.motor : null;
  const motorFallbackLine = String(options.motorFallbackLine ?? "").trim();
  const rows = motorRows(motor);
  const hasMotorDetails = rows.length > 0;
  const hasFallbackOnly = !hasMotorDetails && motorFallbackLine;

  let dataUrl;
  try {
    dataUrl = await QRCode.toDataURL(code, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch {
    return false;
  }

  const w = window.open("", "_blank");
  if (!w) return false;

  const motorBlock = hasMotorDetails
    ? `<dl class="motor-dl">${rows.map(([k, v]) => `<div class="motor-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`
    : hasFallbackOnly
      ? `<p class="motor-one">${esc(motorFallbackLine)}</p>`
      : `<div class="motor-warn">No motor linked on this quote yet. Link the correct motor before attaching this tag.</div>`;

  const customerBlock = customerName
    ? `<div class="customer"><span class="lbl">Customer</span><span class="val">${esc(customerName)}</span></div>`
    : "";

  w.document.open();
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Motor tag ${esc(code)}</title>
<style>
  *{box-sizing:border-box;}
  body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:16px 20px 24px;max-width:420px;margin-left:auto;margin-right:auto;color:#111;}
  .purpose{background:#f0f7ff;border:1px solid #c5d9f0;border-radius:10px;padding:12px 14px;margin-bottom:16px;text-align:left;}
  .purpose h2{margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1a4d8c;}
  .purpose p{margin:0;font-size:12px;line-height:1.5;color:#333;}
  .purpose strong{color:#0d2d5c;}
  .affix-h{margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#444;text-align:left;}
  .motor-box{border:2px dashed #333;border-radius:10px;padding:12px 14px;margin-bottom:18px;text-align:left;background:#fafafa;}
  .customer{margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #ddd;}
  .customer .lbl{display:block;font-size:10px;font-weight:600;text-transform:uppercase;color:#666;margin-bottom:2px;}
  .customer .val{font-size:14px;font-weight:600;}
  .motor-dl{margin:0;}
  .motor-row{display:grid;grid-template-columns:100px 1fr;gap:6px 10px;font-size:13px;margin-bottom:6px;}
  .motor-row dt{margin:0;color:#666;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.02em;}
  .motor-row dd{margin:0;font-weight:600;}
  .motor-one{font-size:14px;font-weight:600;margin:0;line-height:1.4;}
  .motor-warn{margin:0;font-size:12px;color:#92400e;background:#fffbeb;padding:10px;border-radius:8px;border:1px solid #fcd34d;}
  .qr-wrap{text-align:center;margin:16px 0;padding-top:12px;border-top:1px solid #e5e5e5;}
  .rfq{font-size:20px;font-weight:800;letter-spacing:.02em;margin:8px 0 4px;}
  .scan-h{font-size:10px;font-weight:700;text-transform:uppercase;color:#666;margin-bottom:8px;}
  img{display:block;margin:0 auto;}
  .foot{font-size:10px;color:#666;margin-top:12px;line-height:1.45;text-align:center;}
  @media print{body{padding:12px;}.purpose{background:#f5f9ff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<section class="purpose">
  <h2>For technician</h2>
  <p>Scan this <strong>QR code</strong> with the <strong>shop mobile app</strong>. The app opens the <strong>work order</strong> for quote <strong>${esc(code)}</strong> so you can <strong>update status</strong> from the floor.</p>
</section>
<h2 class="affix-h">Paste this tag on this motor</h2>
<section class="motor-box">
  ${customerBlock}
  ${motorBlock}
</section>
<div class="qr-wrap">
  <div class="scan-h">Scan → work order</div>
  <img src="${dataUrl}" alt="QR ${esc(code)}" width="280" height="280" onload="setTimeout(function(){window.focus();window.print();},200)"/>
  <div class="rfq">${esc(code)}</div>
</div>
<p class="foot">QR data: quote number only. App resolves to the correct work order.</p>
</body></html>`);
  w.document.close();
  return true;
}
