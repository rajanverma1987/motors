import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getTechnicianFromRequest } from "@/lib/auth-portal";
import { loadWriteUpQuoteForTechnician } from "@/lib/tech-job-queries";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const quoteId = decodeURIComponent(String(params?.quoteId || "").trim());
    if (!quoteId) {
      return NextResponse.json({ error: "Quote id required" }, { status: 400 });
    }

    await connectDB();
    const payload = await loadWriteUpQuoteForTechnician(tech, quoteId);
    if (!payload) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error("Tech pre-inspection GET:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
