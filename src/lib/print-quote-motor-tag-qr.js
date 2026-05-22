import QRCode from "qrcode";
import { encodeMotorTagCustomerQr } from "@/lib/motor-tag-qr-payload";

/**
 * @typedef {Object} MotorTagPrintOptions
 * @property {string} customerId — required; encoded in QR
 * @property {string} [customerName]
 * @property {Record<string, unknown>} [motor]
 * @property {string} [motorFallbackLine]
 * @property {string} [rfqNumber] — shown on tag for reference
 * @property {string} [technicianName] — assigned technician on linked work order
 * @property {string} [workOrderNumber]
 * @property {string} [workOrderStatus]
 * @property {string} [jobTypeLabel]
 * @property {string} [motorClass] — AC | DC
 * @property {string} [repairJobNumber]
 * @property {string} [estimatedCompletion] — from RFQ / quote
 * @property {string} [customerPo]
 * @property {string} [scopeBrief] — first scope line, truncated
 */

const STYLE_ID = "motor-tag-print-styles";
const PRINT_ROOT_CLASS = "motor-tag-print-offscreen-root";

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

function injectMotorTagPrintStyles() {
  if (typeof document === "undefined") return () => {};
  if (document.getElementById(STYLE_ID)) return () => {};
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      .${PRINT_ROOT_CLASS},
      .${PRINT_ROOT_CLASS} * { visibility: visible !important; }
      .${PRINT_ROOT_CLASS} {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: auto !important;
        min-height: 100% !important;
        overflow: visible !important;
        opacity: 1 !important;
        background: white !important;
        z-index: 2147483647 !important;
        padding: 1rem !important;
      }
    }
    .${PRINT_ROOT_CLASS} {
      box-sizing: border-box;
      font-family: system-ui, -apple-system, sans-serif;
      color: #111;
      max-width: 420px;
      margin: 0 auto;
    }
    .${PRINT_ROOT_CLASS} * { box-sizing: border-box; }
    .${PRINT_ROOT_CLASS} .purpose {
      background: #f0f7ff;
      border: 1px solid #c5d9f0;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 16px;
      text-align: left;
    }
    .${PRINT_ROOT_CLASS} .purpose h2 {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #1a4d8c;
    }
    .${PRINT_ROOT_CLASS} .purpose p {
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      color: #333;
    }
    .${PRINT_ROOT_CLASS} .purpose strong { color: #0d2d5c; }
    .${PRINT_ROOT_CLASS} .affix-h {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #444;
      text-align: left;
    }
    .${PRINT_ROOT_CLASS} .motor-box {
      border: 2px dashed #333;
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 18px;
      text-align: left;
      background: #fafafa;
    }
    .${PRINT_ROOT_CLASS} .customer {
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ddd;
    }
    .${PRINT_ROOT_CLASS} .customer .lbl {
      display: block;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 2px;
    }
    .${PRINT_ROOT_CLASS} .customer .val { font-size: 14px; font-weight: 600; }
    .${PRINT_ROOT_CLASS} .technician {
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ddd;
    }
    .${PRINT_ROOT_CLASS} .technician .lbl {
      display: block;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 2px;
    }
    .${PRINT_ROOT_CLASS} .technician .val { font-size: 14px; font-weight: 600; }
    .${PRINT_ROOT_CLASS} .tag-dl { margin: 0 0 10px; padding-bottom: 10px; border-bottom: 1px solid #ddd; }
    .${PRINT_ROOT_CLASS} .scope-brief {
      margin: 0 0 10px;
      font-size: 12px;
      line-height: 1.45;
      color: #333;
    }
    .${PRINT_ROOT_CLASS} .scope-brief .lbl {
      display: block;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 4px;
    }
    .${PRINT_ROOT_CLASS} .rfq-ref { margin: 0 0 10px; font-size: 13px; color: #444; }
    .${PRINT_ROOT_CLASS} .motor-dl { margin: 0; }
    .${PRINT_ROOT_CLASS} .motor-row {
      display: grid;
      grid-template-columns: 100px 1fr;
      gap: 6px 10px;
      font-size: 13px;
      margin-bottom: 6px;
    }
    .${PRINT_ROOT_CLASS} .motor-row dt {
      margin: 0;
      color: #666;
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .${PRINT_ROOT_CLASS} .motor-row dd { margin: 0; font-weight: 600; }
    .${PRINT_ROOT_CLASS} .motor-one {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
      line-height: 1.4;
    }
    .${PRINT_ROOT_CLASS} .motor-warn {
      margin: 0;
      font-size: 12px;
      color: #92400e;
      background: #fffbeb;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid #fcd34d;
    }
    .${PRINT_ROOT_CLASS} .qr-wrap {
      text-align: center;
      margin: 16px 0;
      padding-top: 12px;
      border-top: 1px solid #e5e5e5;
    }
    .${PRINT_ROOT_CLASS} .scan-h {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 8px;
    }
    .${PRINT_ROOT_CLASS} .qr-wrap img { display: block; margin: 0 auto; }
    .${PRINT_ROOT_CLASS} .foot {
      font-size: 10px;
      color: #666;
      margin-top: 12px;
      line-height: 1.45;
      text-align: center;
    }
    @media print {
      .${PRINT_ROOT_CLASS} .purpose {
        background: #f5f9ff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
  document.head.appendChild(style);
  return () => {
    document.getElementById(STYLE_ID)?.remove();
  };
}

function tagDetailRows(options) {
  const rows = [];
  const push = (label, val) => {
    const v = String(val ?? "").trim();
    if (v) rows.push([label, v]);
  };
  push("Work order #", options.workOrderNumber);
  push("RFQ #", options.rfqNumber);
  push("Repair job #", options.repairJobNumber);
  push("Technician", options.technicianName);
  push("Est. completion", options.estimatedCompletion);
  push("Job type", options.jobTypeLabel);
  push("Motor class", options.motorClass);
  push("Status", options.workOrderStatus);
  push("Customer PO", options.customerPo);
  return rows;
}

function buildMotorTagPrintMarkup(options) {
  const {
    dataUrl,
    customerName,
    rfqNumber,
    motor,
    motorFallbackLine,
    technicianName,
    scopeBrief,
  } = options;
  const rows = motorRows(motor);
  const hasMotorDetails = rows.length > 0;
  const hasFallbackOnly = !hasMotorDetails && motorFallbackLine;

  const motorBlock = hasMotorDetails
    ? `<dl class="motor-dl">${rows.map(([k, v]) => `<div class="motor-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`
    : hasFallbackOnly
      ? `<p class="motor-one">${esc(motorFallbackLine)}</p>`
      : `<div class="motor-warn">No motor linked on this RFQ yet. Link a motor before attaching this tag.</div>`;

  const customerBlock = customerName
    ? `<div class="customer"><span class="lbl">Customer</span><span class="val">${esc(customerName)}</span></div>`
    : `<div class="motor-warn">Customer name not on file — QR still opens assigned work orders for this customer.</div>`;

  const details = tagDetailRows(options);
  const detailsBlock =
    details.length > 0
      ? `<dl class="motor-dl tag-dl">${details.map(([k, v]) => `<div class="motor-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`
      : "";
  const scopeBlock = String(scopeBrief ?? "").trim()
    ? `<p class="scope-brief"><span class="lbl">Scope</span>${esc(scopeBrief)}</p>`
    : "";

  return `
<section class="purpose">
  <h2>For technician</h2>
  <p>Scan this <strong>QR code</strong> with the <strong>shop mobile app</strong>. The app lists <strong>your assigned work orders</strong> for <strong>${esc(customerName || "this customer")}</strong> so you can open a job and <strong>update status</strong> from the floor.</p>
</section>
<h2 class="affix-h">Paste this tag on this motor</h2>
<section class="motor-box">
  ${customerBlock}
  ${detailsBlock}
  ${scopeBlock}
  ${motorBlock}
</section>
<div class="qr-wrap">
  <div class="scan-h">Scan → your work orders</div>
  <img src="${esc(dataUrl)}" alt="QR customer tag" width="280" height="280" />
</div>
<p class="foot">QR links this customer in your shop. Only work orders assigned to you are shown in the app.</p>`;
}

/**
 * Print motor tag on the current page (off-screen root + system print dialog). No new window/tab.
 * @param {MotorTagPrintOptions} options
 * @returns {Promise<boolean>}
 */
export async function printQuoteMotorTagQr(options = {}) {
  if (typeof document === "undefined") return false;

  const customerId = String(options.customerId ?? "").trim();
  const code = encodeMotorTagCustomerQr(customerId);
  if (!code) return false;

  const printFields = {
    customerName: String(options.customerName ?? "").trim(),
    rfqNumber: String(options.rfqNumber ?? "").trim(),
    motor: options.motor && typeof options.motor === "object" ? options.motor : null,
    motorFallbackLine: String(options.motorFallbackLine ?? "").trim(),
    technicianName: String(options.technicianName ?? "").trim(),
    workOrderNumber: String(options.workOrderNumber ?? "").trim(),
    workOrderStatus: String(options.workOrderStatus ?? "").trim(),
    jobTypeLabel: String(options.jobTypeLabel ?? "").trim(),
    motorClass: String(options.motorClass ?? "").trim(),
    repairJobNumber: String(options.repairJobNumber ?? "").trim(),
    estimatedCompletion: String(options.estimatedCompletion ?? "").trim(),
    customerPo: String(options.customerPo ?? "").trim(),
    scopeBrief: String(options.scopeBrief ?? "").trim(),
  };

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

  const removeStyles = injectMotorTagPrintStyles();
  const root = document.createElement("div");
  root.className = PRINT_ROOT_CLASS;
  root.setAttribute("aria-hidden", "true");
  root.style.position = "fixed";
  root.style.left = "-100vw";
  root.style.top = "0";
  root.style.width = "8.5in";
  root.style.maxWidth = "100vw";
  root.style.opacity = "0";
  root.style.pointerEvents = "none";
  root.style.zIndex = "-1";
  root.style.overflow = "hidden";
  root.innerHTML = buildMotorTagPrintMarkup({ dataUrl, ...printFields });
  document.body.appendChild(root);

  const cleanup = () => {
    root.remove();
    removeStyles();
  };

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(ok);
    };

    const handleAfterPrint = () => finish(true);
    window.addEventListener("afterprint", handleAfterPrint, { once: true });

    const triggerPrint = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            window.print();
          } catch {
            finish(false);
          }
        });
      });
    };

    const img = root.querySelector("img");
    if (img && !img.complete) {
      img.onload = triggerPrint;
      img.onerror = () => finish(false);
    } else {
      triggerPrint();
    }

    setTimeout(() => {
      if (!settled) finish(true);
    }, 12000);
  });
}
