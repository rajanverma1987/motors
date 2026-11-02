import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { resolveRepairFlowJobIdForQuote } from "@/lib/quote-repair-flow-job-id";

/**
 * Resolve Job Write-Up job ObjectId from a pipeline flow quote id (for Quotes UI when repairFlowJobId is missing on the RFQ row).
 */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const flowQuoteId = typeof searchParams.get("motorRepairFlowQuoteId") === "string"
      ? searchParams.get("motorRepairFlowQuoteId").trim()
      : "";
    if (!flowQuoteId || !mongoose.isValidObjectId(flowQuoteId)) {
      return NextResponse.json({ error: "Invalid motorRepairFlowQuoteId" }, { status: 400 });
    }
    await connectDB();
    const repairFlowJobId = await resolveRepairFlowJobIdForQuote(
      { repairFlowJobId: "", motorRepairFlowQuoteId: flowQuoteId },
      user.email
    );
    if (!repairFlowJobId || !mongoose.isValidObjectId(repairFlowJobId)) {
      return NextResponse.json({ repairFlowJobId: "" });
    }
    return NextResponse.json({ repairFlowJobId });
  } catch (err) {
    console.error("job-id-from-flow-quote GET:", err);
    return NextResponse.json({ error: "Failed to resolve" }, { status: 500 });
  }
}
