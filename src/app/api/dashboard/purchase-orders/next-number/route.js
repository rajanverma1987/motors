import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";

/** Get next PO number for this user (e.g. P00001, P00002). */
async function getNextPoNumber(createdByEmail) {
  const list = await PurchaseOrder.find({
    createdByEmail,
    poNumber: { $regex: /^P\d+$/, $options: "i" },
  })
    .select("poNumber")
    .lean();
  let maxN = 0;
  for (const po of list) {
    const m = (po.poNumber || "").match(/^P(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxN) maxN = n;
    }
  }
  const next = maxN + 1;
  return "P" + String(next).padStart(5, "0");
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const nextPoNumber = await getNextPoNumber(email);
    return NextResponse.json({ nextPoNumber });
  } catch (err) {
    console.error("Dashboard next PO number error:", err);
    return NextResponse.json({ error: "Failed to get next PO number" }, { status: 500 });
  }
}
