import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import OtherTaxPayment from "@/models/OtherTaxPayment";
import LedgerEntry from "@/models/LedgerEntry";
import { clampString } from "@/lib/validation";

function toNum(v) {
  const n = parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function round2(v) {
  return Math.round((toNum(v) + Number.EPSILON) * 100) / 100;
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));

    const taxType = clampString(body?.taxType, 120).trim();
    const taxPeriod = clampString(body?.taxPeriod, 80).trim();
    const paidDate = clampString(body?.paidDate, 20).trim().slice(0, 10);
    const paidAmountRaw = body?.paidAmount;
    const paidAmount = round2(paidAmountRaw);

    if (!taxType) return NextResponse.json({ error: "Tax type is required" }, { status: 400 });
    if (!paidDate) return NextResponse.json({ error: "Paid date is required" }, { status: 400 });
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      return NextResponse.json({ error: "Paid amount must be greater than zero" }, { status: 400 });
    }

    await connectDB();

    const doc = await OtherTaxPayment.create({
      taxType,
      taxPeriod,
      paidDate,
      paidAmount: String(paidAmount),
      createdByEmail: email,
    });

    const periodPart = taxPeriod ? ` (${taxPeriod})` : "";
    await LedgerEntry.create({
      date: paidDate,
      description: clampString(`Tax payment — ${taxType}${periodPart}`, 200),
      party: "",
      debit: String(paidAmount),
      credit: "0",
      receivable: "0",
      payable: "0",
      status: "Tax payment",
      sourceType: "other_tax_payment",
      sourceId: doc._id.toString(),
      createdByEmail: email,
    });

    return NextResponse.json({
      ok: true,
      payment: {
        id: doc._id.toString(),
        taxType: doc.taxType,
        taxPeriod: doc.taxPeriod || "",
        paidDate: doc.paidDate,
        paidAmount: paidAmount,
      },
    });
  } catch (err) {
    console.error("Other tax payment POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
