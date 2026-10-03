import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import {
  findAssignedJob,
  loadShopMergedSettings,
  requireTechnicianSession,
  serializeMyJobDetail,
} from "@/lib/time-clock-my-jobs";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
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
    const params = await getParams(context);
    const id = String(params?.id || "").trim();
    const doc = await findAssignedJob(shop.ownerEmail, session.employeeId, id);
    if (!doc) {
      return NextResponse.json({ error: "Job not found or not assigned to you." }, { status: 404 });
    }
    const mergedSettings = await loadShopMergedSettings(shop.ownerEmail);
    return NextResponse.json({ job: serializeMyJobDetail(doc, mergedSettings) });
  } catch (err) {
    console.error("Time clock my-jobs detail GET error:", err);
    return NextResponse.json({ error: "Failed to load job" }, { status: 500 });
  }
}
