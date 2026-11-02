import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { loadMergedSettingsForEmail } from "@/lib/simple-service-proposal-list-query";
import OtherTaxPayment from "@/models/OtherTaxPayment";
import LedgerEntry from "@/models/LedgerEntry";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { clampString } from "@/lib/validation";
import {
  listPaidTaxRemittanceJobs,
  listUnpaidTaxRemittanceJobs,
} from "@/lib/simple-tax-remittance";
import mongoose from "mongoose";

function toNum(v) {
  const n = parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function round2(v) {
  return Math.round((toNum(v) + Number.EPSILON) * 100) / 100;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * GET /api/dashboard/simple-tax-remittances?status=unpaid|paid&from=&to=
 */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get("status") || "unpaid").trim().toLowerCase();
    const from = String(searchParams.get("from") || "").trim().slice(0, 10);
    const to = String(searchParams.get("to") || "").trim().slice(0, 10);

    await connectDB();
    const mergedSettings = await loadMergedSettingsForEmail(email);

    if (status === "paid") {
      const data = await listPaidTaxRemittanceJobs(email, mergedSettings, from, to);
      return NextResponse.json({ ok: true, status: "paid", ...data });
    }

    const data = await listUnpaidTaxRemittanceJobs(email, mergedSettings, from, to);
    return NextResponse.json({ ok: true, status: "unpaid", ...data });
  } catch (err) {
    console.error("Simple tax remittances GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load" }, { status: 500 });
  }
}

/**
 * POST /api/dashboard/simple-tax-remittances
 * Period-batch remittance: marks all unpaid tax-collected jobs in from/to as remitted.
 */
export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));

    const taxType = clampString(body?.taxType, 120).trim();
    const taxPeriod = clampString(body?.taxPeriod, 80).trim();
    const paidDate = clampString(body?.paidDate || todayIso(), 20).trim().slice(0, 10);
    const method = clampString(body?.method, 80).trim();
    const paidBy = clampString(body?.paidBy, 120).trim();
    const notes = clampString(body?.notes, 500).trim();
    const from = clampString(body?.from, 10).trim().slice(0, 10);
    const to = clampString(body?.to, 10).trim().slice(0, 10);
    const paidAmount = round2(body?.paidAmount);

    if (!taxType) return NextResponse.json({ error: "Tax type is required" }, { status: 400 });
    if (!paidDate) return NextResponse.json({ error: "Paid date is required" }, { status: 400 });
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      return NextResponse.json({ error: "Paid amount must be greater than zero" }, { status: 400 });
    }

    await connectDB();
    const mergedSettings = await loadMergedSettingsForEmail(email);
    const unpaid = await listUnpaidTaxRemittanceJobs(email, mergedSettings, from, to);
    const proposalIds = unpaid.rows.map((r) => r.id).filter(Boolean);

    if (!proposalIds.length) {
      return NextResponse.json(
        { error: "No unpaid tax-collected jobs in this date range." },
        { status: 400 }
      );
    }

    const doc = await OtherTaxPayment.create({
      taxType,
      taxPeriod,
      paidDate,
      paidAmount: String(paidAmount),
      method,
      paidBy,
      notes,
      proposalIds,
      from,
      to,
      createdByEmail: email,
    });

    const paymentId = doc._id.toString();
    const periodPart = taxPeriod ? ` (${taxPeriod})` : "";
    await LedgerEntry.create({
      date: paidDate,
      description: clampString(`Tax payment: ${taxType}${periodPart}`, 200),
      party: "",
      debit: String(paidAmount),
      credit: "0",
      receivable: "0",
      payable: "0",
      status: "Tax payment",
      sourceType: "other_tax_payment",
      sourceId: paymentId,
      createdByEmail: email,
    });

    const remittedAt = new Date();
    const objectIds = proposalIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    await SimpleServiceProposal.updateMany(
      {
        createdByEmail: email,
        _id: { $in: objectIds },
      },
      {
        $set: {
          taxRemitted: true,
          taxRemittedAt: remittedAt,
          taxRemittancePaymentId: paymentId,
          taxRemittancePaidDate: paidDate,
          taxRemittancePeriod: taxPeriod,
          taxRemittanceTaxType: taxType,
          taxRemittancePaidAmount: paidAmount,
        },
      }
    );

    return NextResponse.json({
      ok: true,
      payment: {
        id: paymentId,
        taxType: doc.taxType,
        taxPeriod: doc.taxPeriod || "",
        paidDate: doc.paidDate,
        paidAmount,
        method: doc.method || "",
        paidBy: doc.paidBy || "",
        notes: doc.notes || "",
        proposalIds,
        from,
        to,
        jobCount: proposalIds.length,
      },
      summary: unpaid.summary,
    });
  } catch (err) {
    console.error("Simple tax remittances POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
