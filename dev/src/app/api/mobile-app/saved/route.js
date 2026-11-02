import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MobileSavedCalculation from "@/models/MobileSavedCalculation";
import { getMobileAppAccountFromRequest, mobileAppUnauthorized } from "@/lib/mobile-app-auth";
import { describeMobileAppAccess } from "@/lib/mobile-app-subscription";
import { clampString } from "@/lib/validation";

export const dynamic = "force-dynamic";

function toJson(doc) {
  return {
    id: String(doc._id),
    calculatorType: doc.calculatorType,
    title: doc.title,
    inputs: doc.inputs || {},
    results: doc.results || {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function GET(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }
    await connectDB();
    const rows = await MobileSavedCalculation.find({ accountId: account._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return NextResponse.json({ items: rows.map(toJson) });
  } catch (err) {
    console.error("mobile-app saved GET:", err);
    return NextResponse.json({ error: err.message || "Failed to load saved calculations" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }
    const access = describeMobileAppAccess(account);
    if (!access.unlocked) {
      return NextResponse.json(
        { error: "Your trial has ended. Subscribe to save calculations.", code: "PAYWALL" },
        { status: 402 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const calculatorType = clampString(body.calculatorType, 64);
    const title = clampString(body.title, 200);
    if (!calculatorType || !title) {
      return NextResponse.json({ error: "Calculator type and title are required." }, { status: 400 });
    }
    await connectDB();
    const doc = await MobileSavedCalculation.create({
      accountId: account._id,
      calculatorType,
      title,
      inputs: body.inputs && typeof body.inputs === "object" ? body.inputs : {},
      results: body.results && typeof body.results === "object" ? body.results : {},
    });
    return NextResponse.json({ item: toJson(doc) });
  } catch (err) {
    console.error("mobile-app saved POST:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
