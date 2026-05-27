import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getTechnicianFromRequest } from "@/lib/auth-portal";
import { listWriteUpPreInspectionsForTechnician } from "@/lib/tech-job-queries";

export async function GET(request) {
  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const assigneeId = String(tech.employeeId || "").trim();
    if (!assigneeId) {
      return NextResponse.json({ preInspections: [] });
    }

    await connectDB();
    const preInspections = await listWriteUpPreInspectionsForTechnician(tech.shopEmail, assigneeId);
    return NextResponse.json({ preInspections });
  } catch (err) {
    console.error("Tech my pre-inspections:", err);
    return NextResponse.json({ error: "Failed to load pre-inspections" }, { status: 500 });
  }
}
