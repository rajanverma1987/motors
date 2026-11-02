import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MobileSavedCalculation from "@/models/MobileSavedCalculation";
import { getMobileAppAccountFromRequest, mobileAppUnauthorized } from "@/lib/mobile-app-auth";

export const dynamic = "force-dynamic";

async function getId(context) {
  const params = typeof context.params?.then === "function" ? await context.params : context.params;
  return params?.id;
}

export async function DELETE(request, context) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }
    const id = await getId(context);
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const result = await MobileSavedCalculation.deleteOne({ _id: id, accountId: account._id });
    if (!result.deletedCount) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("mobile-app saved DELETE:", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
