import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import PurchaseOrder from "@/models/PurchaseOrder";
import Vendor from "@/models/Vendor";
import SalesCommission from "@/models/SalesCommission";
import SalesPerson from "@/models/SalesPerson";
import LedgerEntry from "@/models/LedgerEntry";
import UserSettings from "@/models/UserSettings";
import { invoiceBalance, invoiceLineTotal } from "@/lib/invoice-amounts";
import { invoiceStatusLabel, normalizeInvoiceStatusSlug } from "@/lib/invoice-status";
import { mergeUserSettings } from "@/lib/user-settings";
import { poLineOrderTotal, sumVendorPayments } from "@/lib/po-payable";
import { clampString } from "@/lib/validation";

function toNum(value) {
  const n = parseFloat(String(value ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function round2(value) {
  return Math.round((toNum(value) + Number.EPSILON) * 100) / 100;
}

function toIsoDate(value) {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (!raw) return "";
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function inDateRange(dateValue, from, to) {
  if (!dateValue) return false;
  const day = String(dateValue).slice(0, 10);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ownerEmail = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const from = clampString(searchParams.get("from"), 20).slice(0, 10);
    const to = clampString(searchParams.get("to"), 20).slice(0, 10);

    await connectDB();
    const [invoices, customers, purchaseOrders, vendors, commissions, salesPersons, manualEntries, settingsDoc] =
      await Promise.all([
        Invoice.find({ createdByEmail: ownerEmail }).lean(),
        Customer.find({ createdByEmail: ownerEmail }).select("_id companyName primaryContactName").lean(),
        PurchaseOrder.find({ createdByEmail: ownerEmail }).lean(),
        Vendor.find({ createdByEmail: ownerEmail }).select("_id name").lean(),
        SalesCommission.find({ createdByEmail: ownerEmail }).lean(),
        SalesPerson.find({ createdByEmail: ownerEmail }).select("_id name email phone").lean(),
        LedgerEntry.find({ createdByEmail: ownerEmail }).sort({ date: -1, createdAt: -1 }).lean(),
        UserSettings.findOne({ ownerEmail: ownerEmail }).lean(),
      ]);
    const mergedShop = mergeUserSettings(settingsDoc?.settings);

    const customerMap = Object.fromEntries(
      (customers || []).map((c) => [String(c._id), c.companyName || c.primaryContactName || String(c._id)])
    );
    const vendorMap = Object.fromEntries((vendors || []).map((v) => [String(v._id), v.name || String(v._id)]));
    const salesPersonMap = Object.fromEntries(
      (salesPersons || []).map((sp) => [String(sp._id), sp.name || sp.email || sp.phone || String(sp._id)])
    );

    const rows = [];

    for (const inv of invoices || []) {
      const invoiceDate = toIsoDate(inv.date);
      const billedDate = invoiceDate || toIsoDate(inv.createdAt);
      const billedAmount = round2(invoiceLineTotal(inv));
      const statusSlug = normalizeInvoiceStatusSlug(inv.status, mergedShop);
      const isFullyPaidSemantic =
        statusSlug === "fully_paid" || (statusSlug.includes("fully") && statusSlug.includes("paid"));
      const isPartialPaidSemantic =
        statusSlug === "partial_paid" || (statusSlug.includes("partial") && statusSlug.includes("paid"));
      const invoiceStatus = invoiceStatusLabel(statusSlug, mergedShop);
      const outstandingBalance = round2(invoiceBalance(inv));
      const pays = Array.isArray(inv.payments) ? inv.payments : [];
      const hasPaymentRows = pays.length > 0;
      const creditFallbackForPaid =
        isFullyPaidSemantic && !hasPaymentRows ? billedAmount : 0;
      const receivableForBilledRow = isFullyPaidSemantic
        ? 0
        : isPartialPaidSemantic
          ? outstandingBalance
          : billedAmount;

      rows.push({
        id: `inv-billed-${inv._id}`,
        date: billedDate,
        description: creditFallbackForPaid > 0 ? "Invoice Paid" : "Invoice Billed",
        party: customerMap[String(inv.customerId)] || String(inv.customerId || ""),
        debit: 0,
        credit: creditFallbackForPaid,
        receivable: receivableForBilledRow,
        payable: 0,
        status: invoiceStatus,
      });

      for (const pay of pays) {
        const d = toIsoDate(pay?.paymentDate) || toIsoDate(pay?.recordedAt);
        rows.push({
          id: `inv-pay-${inv._id}-${pay?.recordedAt || d}-${pay?.amount || 0}`,
          date: d,
          description: "Invoice Paid",
          party: customerMap[String(inv.customerId)] || String(inv.customerId || ""),
          debit: 0,
          credit: Math.max(0, round2(pay?.amount)),
          receivable: 0,
          payable: 0,
          status: invoiceStatus,
        });
      }
    }

    for (const po of purchaseOrders || []) {
      const vendorName = vendorMap[String(po.vendorId)] || String(po.vendorId || "");
      const poTotal = round2(poLineOrderTotal(po));
      const paidToVendor = round2(sumVendorPayments(po));
      const payableOutstanding = Math.max(0, round2(poTotal - paidToVendor));

      if (payableOutstanding > 0) {
        rows.push({
          id: `po-payable-${po._id}`,
          date: toIsoDate(po.createdAt),
          description: "Vendor PO",
          party: vendorName,
          debit: 0,
          credit: 0,
          receivable: 0,
          payable: payableOutstanding,
          status: "PAYABLE",
        });
      }

      const poPayments = Array.isArray(po.payments) ? po.payments : [];
      for (const pay of poPayments) {
        rows.push({
          id: `po-pay-${po._id}-${pay?.recordedAt || ""}-${pay?.amount || 0}`,
          date: toIsoDate(pay?.date) || toIsoDate(pay?.recordedAt),
          description: "Vendor Payment",
          party: vendorName,
          debit: round2(pay?.amount),
          credit: 0,
          receivable: 0,
          payable: 0,
          status: "PAID",
        });
      }
    }

    for (const c of commissions || []) {
      const amount = round2(c.amount);
      const who = salesPersonMap[String(c.salesPersonId)] || String(c.salesPersonId || "");
      if (String(c.status || "").toLowerCase() === "paid") {
        rows.push({
          id: `comm-paid-${c._id}`,
          date: toIsoDate(c.paidAt) || toIsoDate(c.updatedAt),
          description: "Commission",
          party: who,
          debit: amount,
          credit: 0,
          receivable: 0,
          payable: 0,
          status: "Paid",
        });
      } else {
        rows.push({
          id: `comm-unpaid-${c._id}`,
          date: toIsoDate(c.createdAt),
          description: "Commission",
          party: who,
          debit: 0,
          credit: 0,
          receivable: 0,
          payable: amount,
          status: "Unpaid",
        });
      }
    }

    for (const m of manualEntries || []) {
      rows.push({
        id: `manual-${m._id}`,
        date: toIsoDate(m.date),
        description: m.description || "Manual Entry",
        party: m.party || "",
        debit: round2(m.debit),
        credit: round2(m.credit),
        receivable: round2(m.receivable),
        payable: round2(m.payable),
        status: m.status || "",
      });
    }

    const filtered = rows
      .filter((r) => inDateRange(r.date, from, to))
      .sort((a, b) => {
        const ad = String(a.date || "");
        const bd = String(b.date || "");
        if (ad === bd) return String(b.id).localeCompare(String(a.id));
        return bd.localeCompare(ad);
      });

    const summary = filtered.reduce(
      (acc, row) => {
        acc.totalDebit += toNum(row.debit);
        acc.totalCredit += toNum(row.credit);
        acc.totalReceivable += toNum(row.receivable);
        acc.totalPayable += toNum(row.payable);
        return acc;
      },
      { totalDebit: 0, totalCredit: 0, totalReceivable: 0, totalPayable: 0 }
    );

    const roundedSummary = {
      totalDebit: round2(summary.totalDebit),
      totalCredit: round2(summary.totalCredit),
      totalReceivable: round2(summary.totalReceivable),
      totalPayable: round2(summary.totalPayable),
      accountBalance: round2(summary.totalCredit - summary.totalDebit),
    };

    return NextResponse.json({ summary: roundedSummary, rows: filtered });
  } catch (err) {
    console.error("Ledger GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load ledger" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ownerEmail = user.email.trim().toLowerCase();
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const date = clampString(body?.date, 20).slice(0, 10);
    if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

    const doc = await LedgerEntry.create({
      date,
      description: clampString(body?.description, 200),
      party: clampString(body?.party, 200),
      debit: String(round2(body?.debit || 0)),
      credit: String(round2(body?.credit || 0)),
      receivable: String(round2(body?.receivable || 0)),
      payable: String(round2(body?.payable || 0)),
      status: clampString(body?.status, 100),
      sourceType: "manual",
      sourceId: "",
      createdByEmail: ownerEmail,
    });
    return NextResponse.json({
      ok: true,
      entry: {
        id: doc._id.toString(),
        date: doc.date,
        description: doc.description,
        party: doc.party,
        debit: round2(doc.debit),
        credit: round2(doc.credit),
        receivable: round2(doc.receivable),
        payable: round2(doc.payable),
        status: doc.status,
      },
    });
  } catch (err) {
    console.error("Ledger POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to create ledger entry" }, { status: 500 });
  }
}
