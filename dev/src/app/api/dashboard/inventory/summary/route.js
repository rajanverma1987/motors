import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import InventoryItem from "@/models/InventoryItem";
import { getPortalUserFromRequest } from "@/lib/auth-portal";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const list = await InventoryItem.find({ createdByEmail: email }).lean();
    let totalSkus = list.length;
    let totalOnHand = 0;
    let totalReserved = 0;
    let lowStockCount = 0;
    for (const row of list) {
      const onHand = Number(row.onHand) || 0;
      const reserved = Number(row.reserved) || 0;
      const avail = onHand - reserved;
      const th = Number(row.threshold) || 0;
      totalOnHand += onHand;
      totalReserved += reserved;
      if (th > 0 && avail <= th) lowStockCount++;
    }
    return NextResponse.json({
      totalSkus,
      totalOnHand,
      totalReserved,
      totalAvailable: totalOnHand - totalReserved,
      lowStockCount,
    });
  } catch (err) {
    console.error("Inventory summary:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
