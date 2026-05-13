import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
import Motor from "@/models/Motor";
import Quote from "@/models/Quote";
import Invoice from "@/models/Invoice";
import UserSettings from "@/models/UserSettings";
import { computeTotalsFromLaborAndParts } from "@/lib/quote-invoice-totals";
import { normalizeInvoiceStatusSlug, invoiceStatusLabel } from "@/lib/invoice-status";
import { mergeUserSettings } from "@/lib/user-settings";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function motorLabelFromDoc(m) {
  if (!m) return "";
  return [m.serialNumber, m.manufacturer, m.model].filter(Boolean).join(" · ") || "";
}

function sumPaymentAmounts(payments) {
  const rows = Array.isArray(payments) ? payments : [];
  let s = 0;
  for (const row of rows) {
    const a = parseFloat(String(row?.amount ?? "").trim());
    if (Number.isFinite(a)) s += a;
  }
  return Math.round(s * 100) / 100;
}

/**
 * GET /api/portal/[token]
 * Public. Returns customer name, motors, repair proposals, and invoices for the customer portal view.
 */
export async function GET(request, context) {
  try {
    const params = await getParams(context);
    const token = params?.token?.trim();
    if (!token) {
      return NextResponse.json({ error: "Invalid link" }, { status: 400 });
    }
    await connectDB();
    const customer = await Customer.findOne({ portalToken: token }).lean();
    if (!customer) {
      return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });
    }
    const customerId = customer._id.toString();
    const ownerEmail = String(customer.createdByEmail || "").trim().toLowerCase();
    const [settingsDoc, motors, quotes, invoices] = await Promise.all([
      ownerEmail ? UserSettings.findOne({ ownerEmail }).lean() : Promise.resolve(null),
      Motor.find({ customerId, createdByEmail: customer.createdByEmail })
        .sort({ createdAt: -1 })
        .lean(),
      Quote.find({ customerId, createdByEmail: customer.createdByEmail })
        .sort({ createdAt: -1 })
        .lean(),
      Invoice.find({ customerId, createdByEmail: customer.createdByEmail })
        .sort({ createdAt: -1 })
        .select(
          "invoiceNumber rfqNumber date status laborTotal partsTotal customerTaxExempt customerTaxPercent customerViewToken motorId scopeLines partsLines customerNotes customerPo estimatedCompletion payments"
        )
        .lean(),
    ]);
    const portalMerged = mergeUserSettings(settingsDoc?.settings);

    const motorById = new Map(motors.map((m) => [m._id.toString(), m]));

    const customerName =
      [customer.primaryContactName, customer.companyName].filter(Boolean).join(" – ") ||
      customer.companyName ||
      "Customer";

    const motorsOut = motors.map((m) => ({
      id: m._id.toString(),
      serialNumber: m.serialNumber ?? "",
      manufacturer: m.manufacturer ?? "",
      model: m.model ?? "",
      hp: m.hp ?? "",
      rpm: m.rpm ?? "",
      voltage: m.voltage ?? "",
      kw: m.kw ?? "",
      amps: m.amps ?? "",
      frameSize: m.frameSize ?? "",
      motorType: m.motorType ?? "",
      notes: m.notes ?? "",
      motorPhotos: Array.isArray(m.motorPhotos) ? m.motorPhotos.map(String) : [],
      nameplateImages: Array.isArray(m.nameplateImages) ? m.nameplateImages.map(String) : [],
    }));

    const mapQuote = (q) => {
      const motor = motorById.get(String(q.motorId || "").trim());
      const totals = computeTotalsFromLaborAndParts({
        laborTotal: q.laborTotal,
        partsTotal: q.partsTotal,
        taxExempt: q.customerTaxExempt,
        taxPercent: q.customerTaxPercent,
      });
      const statusLower = String(q.status ?? "").trim().toLowerCase();
      const attachments = Array.isArray(q.attachments)
        ? q.attachments
            .map((a) => ({
              url: String(a?.url ?? "").trim(),
              name: String(a?.name ?? "").trim() || "Attachment",
            }))
            .filter((a) => a.url)
        : [];
      return {
        id: q._id.toString(),
        rfqNumber: q.rfqNumber ?? "",
        customerPo: q.customerPo ?? "",
        date: q.date ?? "",
        estimatedCompletion: q.estimatedCompletion ?? "",
        motorLabel: motorLabelFromDoc(motor),
        customerNotes: q.customerNotes ?? "",
        repairScope: q.repairScope ?? "",
        scopeLines: Array.isArray(q.scopeLines) ? q.scopeLines : [],
        partsLines: Array.isArray(q.partsLines) ? q.partsLines : [],
        laborTotal: q.laborTotal ?? "",
        partsTotal: q.partsTotal ?? "",
        subtotal: totals.subtotal.toFixed(2),
        taxAmount: totals.taxAmount.toFixed(2),
        grandTotal: totals.grandTotal.toFixed(2),
        attachments,
        respondToken: String(q.respondToken || "").trim(),
        _status: statusLower,
      };
    };

    const quotesEnriched = quotes.map(mapQuote);
    const isClosedQuote = (s) => ["approved", "rejected", "rnr"].includes(s);
    const repairsInProgress = quotesEnriched
      .filter((q) => !isClosedQuote(q._status))
      .map(({ _status, ...rest }) => rest);
    const repairHistory = quotesEnriched
      .filter((q) => isClosedQuote(q._status))
      .map((q) => {
        const { _status, ...rest } = q;
        const outcomeLabel =
          _status === "approved"
            ? "Approved"
            : _status === "rejected"
              ? "Not proceeding"
              : _status === "rnr"
                ? "Return, no repair"
                : "";
        return { ...rest, outcomeLabel };
      });

    const invoicesOut = invoices.map((inv) => {
      const totals = computeTotalsFromLaborAndParts({
        laborTotal: inv.laborTotal,
        partsTotal: inv.partsTotal,
        taxExempt: inv.customerTaxExempt,
        taxPercent: inv.customerTaxPercent,
      });
      const statusSlug = normalizeInvoiceStatusSlug(inv.status, portalMerged);
      const payments = (Array.isArray(inv.payments) ? inv.payments : []).map((p) => ({
        amount: p.amount ?? "",
        paymentDate: p.paymentDate ?? "",
        method: p.method ?? "",
        reference: p.reference ?? "",
      }));
      const totalPaid = sumPaymentAmounts(payments);
      const grand = totals.grandTotal;
      const balanceDue = Math.max(0, Math.round((grand - totalPaid) * 100) / 100);
      const motor = motorById.get(String(inv.motorId || "").trim());
      return {
        id: inv._id.toString(),
        invoiceNumber: inv.invoiceNumber ?? "",
        rfqNumber: inv.rfqNumber ?? "",
        date: inv.date ?? "",
        status: statusSlug,
        statusLabel: invoiceStatusLabel(statusSlug, portalMerged),
        customerPo: inv.customerPo ?? "",
        estimatedCompletion: inv.estimatedCompletion ?? "",
        motorLabel: motorLabelFromDoc(motor),
        scopeLines: Array.isArray(inv.scopeLines) ? inv.scopeLines : [],
        partsLines: Array.isArray(inv.partsLines) ? inv.partsLines : [],
        laborTotal: inv.laborTotal ?? "",
        partsTotal: inv.partsTotal ?? "",
        subtotal: totals.subtotal.toFixed(2),
        taxAmount: totals.taxAmount.toFixed(2),
        grandTotal: totals.grandTotal.toFixed(2),
        customerNotes: inv.customerNotes ?? "",
        payments,
        totalPaid: totalPaid.toFixed(2),
        balanceDue: balanceDue.toFixed(2),
        viewToken: String(inv.customerViewToken || "").trim(),
      };
    });

    return NextResponse.json({
      customer: {
        name: customerName,
        companyName: customer.companyName ?? "",
      },
      motors: motorsOut,
      repairsInProgress,
      repairHistory,
      invoices: invoicesOut,
    });
  } catch (err) {
    console.error("Portal view error:", err);
    return NextResponse.json({ error: "Failed to load portal" }, { status: 500 });
  }
}
