import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest, resolveUserFinancialAccess } from "@/lib/auth-portal";
import UserSettings from "@/models/UserSettings";
import Customer from "@/models/Customer";
import { mergeUserSettings } from "@/lib/user-settings";
import { getWorkspaceSmtpDeliveryNotice } from "@/lib/workspace-smtp-fields";
import { resolveOutboundFromPreview } from "@/lib/customer-facing-email-content";
import { resolveCustomerMailDelivery } from "@/lib/workspace-smtp";
import { getTransporter } from "@/lib/email-transport";
import { clampString } from "@/lib/validation";
import { parseCcEmailList, isSendToEmail } from "@/lib/send-document-custom-message";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildSimpleReportExport } from "@/lib/simple-reports/builders";
import {
  isFinancialSimpleReportId,
  isValidSimpleReportId,
  parseReportFilters,
  SIMPLE_REPORT_CATALOG,
} from "@/lib/simple-reports/catalog";
import {
  buildSimpleReportCustomerEmailHtml,
  filterInvoicesArRowsForEmail,
} from "@/lib/simple-reports/email";

const SENDABLE_REPORTS = new Set(["invoices-ar"]);

function shopCompanyNameFromUser(user) {
  return (user.shopName && String(user.shopName).trim()) || process.env.MOTOR_SHOP_COMPANY_NAME?.trim() || "";
}

function parseIncludeWithoutPo(value) {
  if (value === true || value === 1) return true;
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

/** Preview metadata for Send Invoices / AR report to customer (no HTML body). */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const report = String(searchParams.get("report") || "").trim();
    const from = String(searchParams.get("from") || "").trim().slice(0, 10);
    const to = String(searchParams.get("to") || "").trim().slice(0, 10);
    const customerId = String(searchParams.get("customer") || "").trim();
    const toEmailQ = String(searchParams.get("toEmail") || "").trim();
    const includeWithoutPo = parseIncludeWithoutPo(searchParams.get("includeWithoutPo"));

    if (!SENDABLE_REPORTS.has(report)) {
      return NextResponse.json({ error: "This report cannot be emailed." }, { status: 400 });
    }

    if (isFinancialSimpleReportId(report)) {
      const financialAccess = await resolveUserFinancialAccess(user);
      if (!financialAccess.canViewFinancials) {
        return NextResponse.json(
          { error: "Access denied. Financial report is restricted for your employee role." },
          { status: 403 }
        );
      }
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const uSettings = mergeUserSettings(settingsDoc?.settings);
    const shopCompanyName = shopCompanyNameFromUser(user);

    let toEmail = toEmailQ;
    let toName = "";
    if (customerId) {
      try {
        const cust = await Customer.findOne({ _id: customerId, createdByEmail: email })
          .select({ companyName: 1, email: 1, primaryContactName: 1 })
          .lean();
        if (cust) {
          toName = String(cust.companyName || cust.primaryContactName || "").trim();
          if (!toEmail) toEmail = String(cust.email || "").trim();
        }
      } catch {
        /* ignore invalid id */
      }
    }

    const filters = parseReportFilters(report, searchParams);
    const result = await buildSimpleReportExport({
      report,
      ownerEmail: email,
      from,
      to,
      filters,
      format: "json",
      unpaginated: true,
    });
    const filtered = filterInvoicesArRowsForEmail(result, includeWithoutPo);

    return NextResponse.json({
      ok: true,
      preview: {
        toEmail,
        toName,
        from: resolveOutboundFromPreview(uSettings, shopCompanyName),
        smtp: getWorkspaceSmtpDeliveryNotice(uSettings),
        rowCount: filtered.rowCount,
        includeWithoutPo,
      },
    });
  } catch (err) {
    console.error("Simple report send preview error:", err);
    return NextResponse.json({ error: err.message || "Failed to load preview" }, { status: 500 });
  }
}

/** Email Invoices / AR report HTML (with grand totals) to the customer. */
export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "simple-report-send", 20);
  if (!allowed) {
    return NextResponse.json({ error: "Too many send requests. Try again later." }, { status: 429 });
  }

  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const report = String(body?.report || "").trim();
    const from = String(body?.from || "").trim().slice(0, 10);
    const to = String(body?.to || "").trim().slice(0, 10);
    const filtersRaw = body?.filters && typeof body.filters === "object" ? body.filters : {};
    const customMessage = clampString(body?.customMessage, 2000);
    const includeWithoutPo = parseIncludeWithoutPo(body?.includeWithoutPo);
    const { ccEmails, error: ccError } = parseCcEmailList(body?.cc);
    if (ccError) {
      return NextResponse.json({ error: ccError }, { status: 400 });
    }

    if (!isValidSimpleReportId(report) || !SENDABLE_REPORTS.has(report)) {
      return NextResponse.json({ error: "This report cannot be emailed." }, { status: 400 });
    }

    if (isFinancialSimpleReportId(report)) {
      const financialAccess = await resolveUserFinancialAccess(user);
      if (!financialAccess.canViewFinancials) {
        return NextResponse.json(
          { error: "Access denied. Financial report is restricted for your employee role." },
          { status: 403 }
        );
      }
    }

    const toEmail = String(body?.toEmail || "").trim();
    if (!isSendToEmail(toEmail)) {
      return NextResponse.json({ error: "Enter a valid customer email." }, { status: 400 });
    }
    let toName = String(body?.toName || "").trim();

    await connectDB();
    const ownerEmail = user.email.trim().toLowerCase();
    const filters = parseReportFilters(report, filtersRaw);

    if (filters.customer && !toName) {
      try {
        const cust = await Customer.findOne({ _id: filters.customer, createdByEmail: ownerEmail })
          .select({ companyName: 1, primaryContactName: 1 })
          .lean();
        toName = String(cust?.companyName || cust?.primaryContactName || "").trim();
      } catch {
        /* ignore */
      }
    }

    const catalog = SIMPLE_REPORT_CATALOG.find((r) => r.id === report);
    const title = catalog?.title || "Invoices / AR";

    const result = await buildSimpleReportExport({
      report,
      ownerEmail,
      from,
      to,
      filters,
      format: "json",
      unpaginated: true,
    });
    const filtered = filterInvoicesArRowsForEmail(result, includeWithoutPo);

    if (!filtered.rowCount) {
      return NextResponse.json(
        {
          error: includeWithoutPo
            ? "No invoices match this report to send."
            : "No invoices with a PO match this report. Turn on Include invoices without PO to send all.",
        },
        { status: 400 }
      );
    }

    const shopCompanyName = shopCompanyNameFromUser(user);
    const settingsDoc = await UserSettings.findOne({ ownerEmail }).lean();
    const uSettings = mergeUserSettings(settingsDoc?.settings);

    const { subject, html } = buildSimpleReportCustomerEmailHtml({
      title,
      customerName: toName,
      shopCompanyName,
      headers: filtered.headers,
      rows: filtered.rows,
      amountColumns: filtered.amountColumns,
      amountTotals: filtered.amountTotals,
      customMessage,
    });

    const mail = resolveCustomerMailDelivery(uSettings, shopCompanyName);
    if (mail.error) {
      return NextResponse.json({ error: mail.error }, { status: 400 });
    }
    const transport = mail.transport || getTransporter();
    if (!transport) {
      return NextResponse.json(
        { error: "Email is not configured. Set up SMTP in Settings." },
        { status: 400 }
      );
    }

    await transport.sendMail({
      from: mail.from,
      to: toEmail,
      subject,
      html,
      ...(ccEmails.length ? { cc: ccEmails.join(", ") } : {}),
    });

    return NextResponse.json({
      ok: true,
      message: `Report sent to ${toEmail}.`,
      preview: {
        from: resolveOutboundFromPreview(uSettings, shopCompanyName),
        toEmail,
        toName,
        smtp: getWorkspaceSmtpDeliveryNotice(uSettings),
        rowCount: filtered.rowCount,
      },
    });
  } catch (err) {
    console.error("Simple report send error:", err);
    return NextResponse.json({ error: err.message || "Failed to send report" }, { status: 500 });
  }
}
