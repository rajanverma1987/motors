import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WireSize from "@/models/WireSize";
import { getTechnicianFromRequest } from "@/lib/auth-portal";

function toJson(doc) {
  return {
    id: doc._id?.toString(),
    size: doc.size ?? "",
    circularMills: doc.circularMills ?? 0,
    isActive: Boolean(doc.isActive),
  };
}

/** Read-only: shop wire catalog for CM Best Match in the Technician app (same data as dashboard calculators). */
export async function GET(request) {
  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const shopEmail = String(tech.shopEmail || "")
      .trim()
      .toLowerCase();
    const list = await WireSize.find({ createdByEmail: shopEmail, isActive: true })
      .sort({ size: 1 })
      .lean();
    return NextResponse.json(list.map(toJson));
  } catch (err) {
    console.error("Tech wire-sizes GET error:", err);
    return NextResponse.json({ error: "Failed to load wire sizes" }, { status: 500 });
  }
}
