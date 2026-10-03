import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import {
  loadShopMergedSettings,
  mongoMyJobsTechnicianClause,
  proposalAssignedToEmployee,
  requireTechnicianSession,
  serializeMyJobListRow,
} from "@/lib/time-clock-my-jobs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get("token") || "").trim();
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }
    await connectDB();
    const auth = await requireTechnicianSession(request, token);
    if (auth.error) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }
    const { session, shop } = auth;
    const mergedSettings = await loadShopMergedSettings(shop.ownerEmail);

    const list = await SimpleServiceProposal.find({
      createdByEmail: shop.ownerEmail,
      ...mongoMyJobsTechnicianClause(session.employeeId),
    })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    const items = list
      .filter((doc) => proposalAssignedToEmployee(doc, session.employeeId))
      .map((doc) => serializeMyJobListRow(doc, mergedSettings))
      .filter((row) => !row.jobStatusClosed);

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Time clock my-jobs GET error:", err);
    return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 });
  }
}
