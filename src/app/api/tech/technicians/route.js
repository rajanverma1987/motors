import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import { getTechnicianFromRequest } from "@/lib/auth-portal";

/**
 * Employees with technician app access — for work order reassignment in the mobile app.
 */
export async function GET(request) {
  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const list = await Employee.find({
      createdByEmail: tech.shopEmail,
      technicianAppAccess: true,
    })
      .select({ name: 1, email: 1 })
      .sort({ name: 1, email: 1 })
      .lean();

    return NextResponse.json(
      list.map((e) => ({
        id: e._id.toString(),
        name: String(e.name || "").trim() || String(e.email || "").trim(),
        email: String(e.email || "").trim(),
      }))
    );
  } catch (err) {
    console.error("Tech list technicians:", err);
    return NextResponse.json({ error: "Failed to load technicians" }, { status: 500 });
  }
}
