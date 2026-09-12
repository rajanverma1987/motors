import { connectDB } from "@/lib/db";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import UserSettings from "@/models/UserSettings";
import Vendor from "@/models/Vendor";
import { mergeUserSettings } from "@/lib/user-settings";
import {
  normalizeWorkspaceSmtpFields,
  workspaceSmtpIsComplete,
  workspaceSmtpIsReadyForSendUi,
} from "@/lib/workspace-smtp-fields";
import { createWorkspaceSmtpTransport, formatWorkspaceSmtpFrom } from "@/lib/workspace-smtp";
import { resolveShopEmailLogo } from "@/lib/shop-email-logo";
import { shopEmailLogoInlineStyle } from "@/lib/logo-document-scale";
import { toInputDateValue } from "@/lib/format-date";
import {
  resolvePoStatus,
  SIMPLE_PO_RECEIVING_STATUS_RECEIVED,
  SIMPLE_PO_RECEIVING_STATUS_CANCELLED,
  SIMPLE_PO_RECEIVING_STATUS_RETURNED,
  SIMPLE_PO_TYPE_JOB,
  resolveSimplePoType,
} from "@/lib/simple-purchase-order-form";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 * Parse comma, semicolon, space, or newline separated email addresses.
 * @param {string|string[]} raw
 * @returns {string[]}
 */
export function parseNotificationEmails(raw) {
  if (Array.isArray(raw)) {
    return Array.from(
      new Set(
        raw
          .map((e) => String(e || "").trim().toLowerCase())
          .filter((e) => EMAIL_RE.test(e))
      )
    );
  }
  const str = String(raw || "").trim();
  if (!str) return [];
  const parts = str.split(/[\s,;\n\r]+/);
  return Array.from(
    new Set(
      parts
        .map((p) => p.trim().toLowerCase())
        .filter((p) => EMAIL_RE.test(p))
    )
  );
}

/**
 * Compare calendar difference between due date and reference date (UTC-based).
 * @param {string} dueYmd "YYYY-MM-DD"
 * @param {string} refYmd "YYYY-MM-DD"
 * @returns {number} positive = days in future, 0 = due today, negative = days overdue
 */
export function getCalendarDayDiff(dueYmd, refYmd) {
  const [y1, m1, d1] = dueYmd.split("-").map(Number);
  const [y2, m2, d2] = refYmd.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24));
}

/**
 * Check whether a PO has pending items awaiting delivery.
 * @param {object} po
 */
export function isPoPendingDelivery(po) {
  const lineItems = Array.isArray(po?.lineItems) ? po.lineItems : [];
  if (lineItems.length > 0) {
    const status = resolvePoStatus(lineItems);
    if (
      status === SIMPLE_PO_RECEIVING_STATUS_RECEIVED ||
      status === SIMPLE_PO_RECEIVING_STATUS_CANCELLED ||
      status === SIMPLE_PO_RECEIVING_STATUS_RETURNED
    ) {
      return false;
    }
    return true;
  }
  const paymentStatus = String(po?.paymentStatus || "").toLowerCase();
  if (paymentStatus === "cancelled" || paymentStatus === "returned") return false;
  return true;
}

/**
 * Extract unfulfilled / pending line items from a PO.
 * @param {object[]} lineItems
 */
export function extractPendingLineItems(lineItems) {
  return (Array.isArray(lineItems) ? lineItems : [])
    .filter((line) => {
      if (!line || typeof line !== "object") return false;
      if (line.cancelled || line.returned) return false;
      const status = String(line.receivingStatus || "").toLowerCase();
      if (status === "received" || status === "cancelled" || status === "returned") return false;
      const qty = parseFloat(line.quantity || "0") || 0;
      const rec = parseFloat(line.receivedQty || "0") || 0;
      if (qty > 0 && rec >= qty) return false;
      return Boolean(String(line.itemName || "").trim() || qty > 0);
    })
    .map((line) => ({
      itemName: String(line.itemName || "").trim() || "Item",
      quantity: String(line.quantity || "1").trim(),
      receivedQty: String(line.receivedQty || "0").trim(),
      uom: String(line.uom || "").trim(),
      receivingStatus: String(line.receivingStatus || "Ordered").trim(),
      vendorInvoiceNumber: String(line.vendorInvoiceNumber || "").trim(),
    }));
}

/**
 * Find purchase orders approaching due or overdue for a shop.
 * @param {object} opts
 * @param {string} opts.ownerEmail
 * @param {number} [opts.daysBefore]
 * @param {boolean} [opts.includeOverdue]
 * @param {Date} [opts.referenceDate]
 */
export async function findDuePurchaseOrders({
  ownerEmail,
  daysBefore = 2,
  includeOverdue = true,
  referenceDate = new Date(),
}) {
  await connectDB();
  const emailNorm = String(ownerEmail || "").trim().toLowerCase();
  if (!emailNorm) return { approaching: [], overdue: [], all: [] };

  const refYmd = toInputDateValue(referenceDate);
  const thresholdDays = Math.max(0, Math.min(30, Number(daysBefore) || 2));

  const docs = await SimplePurchaseOrder.find({
    createdByEmail: emailNorm,
    dueDate: { $ne: null },
  })
    .sort({ dueDate: 1 })
    .lean();

  const vendorIds = Array.from(
    new Set(docs.map((d) => String(d.vendorId || "").trim()).filter(Boolean))
  );

  const vendors = vendorIds.length
    ? await Vendor.find({ _id: { $in: vendorIds }, createdByEmail: emailNorm }).lean()
    : [];

  const vendorMap = new Map();
  for (const v of vendors) {
    vendorMap.set(String(v._id), {
      name: String(v.name || v.companyName || "").trim(),
      contactName: String(v.contactName || "").trim(),
      phone: String(v.phone || "").trim(),
      email: String(v.email || "").trim(),
    });
  }

  const approaching = [];
  const overdue = [];

  for (const doc of docs) {
    if (!isPoPendingDelivery(doc)) continue;
    const dueYmd = toInputDateValue(doc.dueDate);
    if (!dueYmd) continue;

    const diff = getCalendarDayDiff(dueYmd, refYmd);
    const pendingLines = extractPendingLineItems(doc.lineItems);
    const vendorMeta = doc.vendorId ? vendorMap.get(String(doc.vendorId)) : null;

    const poType = resolveSimplePoType(doc);
    const item = {
      id: String(doc._id || doc.id || ""),
      poNumber: String(doc.poNumber || "").trim() || "Unnumbered PO",
      poType,
      jobNumber: poType === SIMPLE_PO_TYPE_JOB ? String(doc.jobNumber || "").trim() : "",
      vendorName: vendorMeta?.name || String(doc.vendorName || "").trim() || "Vendor",
      vendorPhone: vendorMeta?.phone || "",
      vendorEmail: vendorMeta?.email || "",
      vendorContactName: vendorMeta?.contactName || "",
      dueDate: dueYmd,
      poCutDate: toInputDateValue(doc.poCutDate),
      diffDays: diff,
      pendingLines,
      lastDueNotificationSentAt: doc.lastDueNotificationSentAt || null,
      totalPendingItems: pendingLines.length,
    };

    if (diff < 0) {
      if (includeOverdue) {
        overdue.push({ ...item, daysOverdue: Math.abs(diff), isOverdue: true });
      }
    } else if (diff <= thresholdDays) {
      approaching.push({ ...item, daysRemaining: diff, isApproaching: true });
    }
  }

  // Sort: most overdue first, approaching closest due date first
  overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
  approaching.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return {
    approaching,
    overdue,
    all: [...overdue, ...approaching],
  };
}

/**
 * Build responsive HTML and text email content for PO due notification.
 */
export function buildPoDueNotificationEmail({
  recipientEmails = [],
  approaching = [],
  overdue = [],
  shopName = "Our Shop",
  settings = {},
  baseUrl = "",
}) {
  const shopLogo = resolveShopEmailLogo({
    ownerEmail: settings.ownerEmail || "",
    logoUrl: settings.logoUrl || "",
    baseUrl,
  });
  const logoStyle = shopEmailLogoInlineStyle(settings.logoDocumentScale);
  const logoHtml = shopLogo?.logoSrc
    ? `<div style="margin-bottom:16px"><img src="${esc(shopLogo.logoSrc)}" alt="${esc(shopName)}" height="${logoStyle.heightPx}" style="${logoStyle.style};display:block;border:0" /></div>`
    : "";

  const totalCount = overdue.length + approaching.length;
  let subject = `Purchase Order Delivery Alert: ${totalCount} PO(s) Require Attention`;
  if (overdue.length > 0 && approaching.length === 0) {
    subject = `Urgent: ${overdue.length} Overdue Purchase Order(s) Pending Delivery: ${shopName}`;
  } else if (overdue.length === 0 && approaching.length > 0) {
    subject = `Reminder: ${approaching.length} Purchase Order(s) Approaching Due Date: ${shopName}`;
  } else if (overdue.length > 0 && approaching.length > 0) {
    subject = `Action Required: ${overdue.length} Overdue and ${approaching.length} Approaching Purchase Orders: ${shopName}`;
  }

  const renderPoTable = (list, isOverdueSection) => {
    if (!list.length) return "";
    const rowsHtml = list
      .map((po) => {
        const vendorContactParts = [
          po.vendorName,
          po.vendorPhone ? `Tel: ${po.vendorPhone}` : "",
          po.vendorEmail ? `Email: ${po.vendorEmail}` : "",
        ]
          .filter(Boolean)
          .join(" | ");

        const dueLabel = isOverdueSection
          ? `<span style="color:#dc2626;font-weight:700">${po.daysOverdue} day${po.daysOverdue === 1 ? "" : "s"} overdue (Due ${esc(po.dueDate)})</span>`
          : po.daysRemaining === 0
            ? `<span style="color:#d97706;font-weight:700">Due Today (${esc(po.dueDate)})</span>`
            : `<span style="color:#2563eb;font-weight:600">Due in ${po.daysRemaining} day${po.daysRemaining === 1 ? "" : "s"} (${esc(po.dueDate)})</span>`;

        const jobBadge = po.jobNumber
          ? `<span style="display:inline-block;padding:1px 6px;border-radius:4px;background:#e0f2fe;color:#0369a1;font-size:11px;font-weight:600;margin-left:6px">Job #${esc(po.jobNumber)}</span>`
          : "";

        const linesHtml = po.pendingLines.length
          ? `<table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:11px;background:#f9fafb;border-radius:4px">
              <thead>
                <tr style="border-bottom:1px solid #e5e7eb;text-align:left;color:#4b5563">
                  <th style="padding:4px 6px">Item</th>
                  <th style="padding:4px 6px;text-align:right">Ordered</th>
                  <th style="padding:4px 6px;text-align:right">Received</th>
                  <th style="padding:4px 6px">Status</th>
                  ${po.pendingLines.some((l) => l.vendorInvoiceNumber) ? `<th style="padding:4px 6px">Vendor Inv#</th>` : ""}
                </tr>
              </thead>
              <tbody>
                ${po.pendingLines
                  .map(
                    (l) => `
                  <tr style="border-bottom:1px solid #f3f4f6">
                    <td style="padding:4px 6px;color:#111827">${esc(l.itemName)}</td>
                    <td style="padding:4px 6px;text-align:right;color:#374151">${esc(l.quantity)} ${esc(l.uom)}</td>
                    <td style="padding:4px 6px;text-align:right;color:#374151">${esc(l.receivedQty)}</td>
                    <td style="padding:4px 6px;color:#4b5563">${esc(l.receivingStatus)}</td>
                    ${po.pendingLines.some((pl) => pl.vendorInvoiceNumber) ? `<td style="padding:4px 6px;color:#4b5563">${esc(l.vendorInvoiceNumber || "")}</td>` : ""}
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>`
          : `<p style="margin:4px 0 0;font-size:11px;color:#6b7280;font-style:italic">No line item breakdown available.</p>`;

        return `
          <div style="border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-bottom:12px;background:#ffffff">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
              <div>
                <strong style="font-size:14px;color:#111827">PO #${esc(po.poNumber)}</strong>
                ${jobBadge}
                <div style="font-size:12px;color:#4b5563;margin-top:2px">${esc(vendorContactParts)}</div>
              </div>
              <div style="font-size:12px;text-align:right">
                ${dueLabel}
              </div>
            </div>
            ${linesHtml}
          </div>
        `;
      })
      .join("");

    return rowsHtml;
  };

  const overdueBlock = overdue.length
    ? `
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="display:inline-block;padding:3px 10px;border-radius:9999px;background:#fee2e2;color:#991b1b;font-size:12px;font-weight:700">
          OVERDUE (${overdue.length})
        </span>
        <span style="font-size:12px;color:#6b7280">Expected delivery dates have passed</span>
      </div>
      ${renderPoTable(overdue, true)}
    </div>
  `
    : "";

  const approachingBlock = approaching.length
    ? `
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="display:inline-block;padding:3px 10px;border-radius:9999px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700">
          APPROACHING DUE (${approaching.length})
        </span>
        <span style="font-size:12px;color:#6b7280">Expected for delivery shortly</span>
      </div>
      ${renderPoTable(approaching, false)}
    </div>
  `
    : "";

  const poLink = baseUrl ? `${baseUrl}/dashboards/purchase-orders` : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f4f5f7;color:#1f2937">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
    <div style="padding:24px 28px 16px;border-bottom:1px solid #f3f4f6">
      ${logoHtml}
      <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111827">${esc(shopName)}</h1>
      <p style="margin:0;font-size:13px;color:#4b5563">Purchase Order Delivery Status Alert</p>
    </div>

    <div style="padding:20px 28px">
      <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#374151">
        This is an automated notification regarding purchase orders with approaching or past expected delivery dates. Please follow up with vendors on items pending receipt.
      </p>

      ${overdueBlock}
      ${approachingBlock}

      ${
        poLink
          ? `
        <div style="margin:24px 0 12px;text-align:center">
          <a href="${esc(poLink)}" style="display:inline-block;padding:10px 20px;border-radius:6px;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px">
            View Purchase Orders in Dashboard
          </a>
        </div>
      `
          : ""
      }
    </div>

    <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;line-height:1.5">
      <p style="margin:0 0 4px">Sent via shop workspace SMTP from ${esc(shopName)}.</p>
      <p style="margin:0">To update delivery notification preferences, alert windows, or recipient emails, open Settings and go to Email Settings.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  // Plain-text alternative
  const textLines = [
    `${shopName}: Purchase Order Delivery Status Alert`,
    "",
    "The following purchase orders are approaching or past their expected delivery date:",
    "",
  ];

  if (overdue.length) {
    textLines.push(`--- OVERDUE PURCHASE ORDERS (${overdue.length}) ---`);
    for (const po of overdue) {
      textLines.push(`* PO #${po.poNumber} (${po.daysOverdue} days overdue, due ${po.dueDate})`);
      textLines.push(`  Vendor: ${po.vendorName}${po.vendorPhone ? ` | Tel: ${po.vendorPhone}` : ""}${po.vendorEmail ? ` | Email: ${po.vendorEmail}` : ""}`);
      if (po.jobNumber) textLines.push(`  Job #${po.jobNumber}`);
      if (po.pendingLines.length) {
        textLines.push("  Pending Items:");
        for (const line of po.pendingLines) {
          textLines.push(`    - ${line.itemName}: ${line.receivedQty}/${line.quantity} ${line.uom} (${line.receivingStatus})`);
        }
      }
      textLines.push("");
    }
  }

  if (approaching.length) {
    textLines.push(`--- APPROACHING DELIVERY DATES (${approaching.length}) ---`);
    for (const po of approaching) {
      const dueText = po.daysRemaining === 0 ? "Due Today" : `Due in ${po.daysRemaining} days`;
      textLines.push(`* PO #${po.poNumber} (${dueText}, due ${po.dueDate})`);
      textLines.push(`  Vendor: ${po.vendorName}${po.vendorPhone ? ` | Tel: ${po.vendorPhone}` : ""}${po.vendorEmail ? ` | Email: ${po.vendorEmail}` : ""}`);
      if (po.jobNumber) textLines.push(`  Job #${po.jobNumber}`);
      if (po.pendingLines.length) {
        textLines.push("  Pending Items:");
        for (const line of po.pendingLines) {
          textLines.push(`    - ${line.itemName}: ${line.receivedQty}/${line.quantity} ${line.uom} (${line.receivingStatus})`);
        }
      }
      textLines.push("");
    }
  }

  if (poLink) {
    textLines.push(`Open Purchase Orders: ${poLink}`);
    textLines.push("");
  }
  textLines.push(`Sent via shop workspace SMTP from ${shopName}.`);

  return {
    subject,
    html,
    text: textLines.join("\n"),
  };
}

/**
 * Send purchase order due notifications for a specific shop owner.
 * Strictly uses shop workspace SMTP.
 *
 * @param {object} opts
 * @param {string} opts.ownerEmail
 * @param {boolean} [opts.force] bypass enabled check and cooldown
 * @param {string} [opts.baseUrl]
 * @param {string[]} [opts.customRecipients]
 */
export async function sendPoDueNotifications({
  ownerEmail,
  force = false,
  baseUrl = "",
  customRecipients,
}) {
  await connectDB();
  const emailNorm = String(ownerEmail || "").trim().toLowerCase();
  if (!emailNorm) {
    return { ok: false, error: "Shop owner email is required." };
  }

  const settingsDoc = await UserSettings.findOne({ ownerEmail: emailNorm }).lean();
  const uSettings = mergeUserSettings(settingsDoc?.settings);

  if (!force && uSettings.poDueNotificationEnabled === false) {
    return { ok: true, sent: false, message: "Purchase order due notifications are disabled in Settings." };
  }

  const smtp = normalizeWorkspaceSmtpFields(uSettings);
  if (!smtp.smtpEnabled || !workspaceSmtpIsComplete(smtp)) {
    return {
      ok: false,
      error:
        "Shop SMTP is required for purchase order notifications. Please configure and enable your shop SMTP in Settings: Email Settings.",
      smtpConfigured: false,
    };
  }

  const transport = createWorkspaceSmtpTransport(smtp);
  if (!transport) {
    return {
      ok: false,
      error: "Could not create workspace SMTP transport. Verify host, port, credentials, and SSL settings.",
      smtpConfigured: false,
    };
  }

  const recipients = Array.isArray(customRecipients) && customRecipients.length
    ? parseNotificationEmails(customRecipients)
    : parseNotificationEmails(uSettings.poDueNotificationEmails);

  if (!recipients.length) {
    recipients.push(emailNorm);
  }

  const dueResult = await findDuePurchaseOrders({
    ownerEmail: emailNorm,
    daysBefore: uSettings.poDueNotificationDaysBefore ?? 2,
    includeOverdue: uSettings.poDueNotificationIncludeOverdue !== false,
  });

  const { approaching, overdue, all } = dueResult;
  if (!all.length) {
    try {
      transport.close();
    } catch (_) {}
    return {
      ok: true,
      sent: false,
      count: 0,
      approachingCount: 0,
      overdueCount: 0,
      recipients,
      message: "No purchase orders are currently approaching or past their expected due date.",
    };
  }

  const shopName = String(uSettings.shopName || "").trim() || "Motor Repair Shop";
  const emailContent = buildPoDueNotificationEmail({
    recipientEmails: recipients,
    approaching,
    overdue,
    shopName,
    settings: { ...uSettings, ownerEmail: emailNorm },
    baseUrl,
  });

  const from = formatWorkspaceSmtpFrom(smtp.smtpFromName || shopName, smtp.smtpFromEmail);

  try {
    await transport.sendMail({
      from,
      to: recipients,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  } catch (err) {
    console.error("Failed to send PO due notification email via shop SMTP:", err);
    return {
      ok: false,
      error: `Failed to send email via shop SMTP: ${err.message || String(err)}`,
    };
  } finally {
    try {
      transport.close();
    } catch (_) {}
  }

  const nowIso = new Date().toISOString();
  const poIds = all.map((p) => p.id).filter(Boolean);
  if (poIds.length) {
    await SimplePurchaseOrder.updateMany(
      { _id: { $in: poIds } },
      { $set: { lastDueNotificationSentAt: new Date() } }
    );
  }

  await UserSettings.updateOne(
    { ownerEmail: emailNorm },
    { $set: { "settings.poDueNotificationLastAutoRunAt": nowIso } }
  );

  return {
    ok: true,
    sent: true,
    count: all.length,
    overdueCount: overdue.length,
    approachingCount: approaching.length,
    recipients,
    message: `Notification sent to ${recipients.join(", ")} for ${all.length} purchase order(s).`,
  };
}
