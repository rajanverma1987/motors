import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import UserSettings from "@/models/UserSettings";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { mergeUserSettings } from "@/lib/user-settings";
import {
  graceDaysFromAccountsPaymentTermsSlug,
  isOpenInvoiceOverdueForTerms,
} from "@/lib/accounts-payment-terms";
import { accountsPaymentTermsLabel } from "@/lib/accounts-display";
import {
  invoiceBalance,
  invoiceLineTotal,
  invoiceTotalPaid,
  daysOutstanding,
  agingBucket,
} from "@/lib/invoice-amounts";
import { normalizeInvoiceStatusSlug } from "@/lib/invoice-status";

function buildRows(list, custMap) {
  return list.map((inv) => {
    const total = invoiceLineTotal(inv);
    const paid = invoiceTotalPaid(inv);
    const balance = invoiceBalance(inv);
    const days = daysOutstanding(inv.date);
    return {
      id: inv._id.toString(),
      invoiceNumber: inv.invoiceNumber || inv.rfqNumber || "",
      rfqNumber: inv.rfqNumber || "",
      customerId: String(inv.customerId),
      customerName: custMap[String(inv.customerId)] || inv.customerId,
      date: inv.date || "",
      status: normalizeInvoiceStatusSlug(inv.status),
      invoiceTotal: total,
      amountPaid: paid,
      balance,
      daysOutstanding: days,
      agingBucket: agingBucket(days),
      paymentCount: Array.isArray(inv.payments) ? inv.payments.length : 0,
    };
  });
}

/**
 * GET ?include=open|draft|paid|all
 * - open: sent/partial with balance > 0 (default receivable)
 * - draft: draft with balance > 0
 * - paid: fully_paid
 * - all: every invoice
 */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const include = String(searchParams.get("include") || "open").toLowerCase();

    await connectDB();
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const userSettings = mergeUserSettings(settingsDoc?.settings);
    const termsSlug = userSettings.accountsPaymentTerms || "net30";
    const overdueGraceDays = graceDaysFromAccountsPaymentTermsSlug(termsSlug);
    const overdueTermsLabel = accountsPaymentTermsLabel(termsSlug);

    const query = { createdByEmail: email };
    if (include === "open") {
      query.status = { $in: ["sent", "partial_paid"] };
    } else if (include === "draft") {
      query.status = "draft";
    } else if (include === "paid") {
      query.status = "fully_paid";
    }

    const list = await Invoice.find(query).sort({ date: -1, createdAt: -1 }).lean();
    const customerIds = [...new Set(list.map((i) => String(i.customerId)))];
    const customers = await Customer.find({
      _id: { $in: customerIds },
      createdByEmail: email,
    }).lean();
    const custMap = Object.fromEntries(
      (customers || []).map((c) => [
        String(c._id),
        c.companyName || c.primaryContactName || String(c._id),
      ])
    );

    let rows = buildRows(list, custMap);

    if (include === "open") {
      rows = rows.filter((r) => r.balance > 0.009);
    } else if (include === "draft") {
      rows = rows.filter((r) => r.balance > 0.009);
    }

    const openForSummary = await Invoice.find({
      createdByEmail: email,
      status: { $in: ["sent", "partial_paid"] },
    }).lean();
    const openRowsFull = buildRows(openForSummary, custMap).filter((r) => r.balance > 0.009);
    const totalOutstanding =
      Math.round(openRowsFull.reduce((s, r) => s + r.balance, 0) * 100) / 100;
    const openCount = openRowsFull.length;
    const overdueCount = openRowsFull.filter((r) =>
      isOpenInvoiceOverdueForTerms(r.daysOutstanding, termsSlug)
    ).length;

    return NextResponse.json({
      summary: {
        totalOutstanding,
        openCount,
        overdueCount,
        overdueGraceDays,
        overdueTermsLabel,
      },
      rows,
    });
  } catch (err) {
    console.error("Accounts receivable GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
