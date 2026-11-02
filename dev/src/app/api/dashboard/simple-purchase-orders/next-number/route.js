import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import UserSettings from "@/models/UserSettings";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { effectiveShopPoNumberPrefix } from "@/lib/document-number-prefixes";
import { mergeUserSettings } from "@/lib/user-settings";
import {
  computeNextShopPoNumber,
  resolveSimplePoType,
  SIMPLE_PO_TYPE_SHOP,
} from "@/lib/simple-purchase-order-form";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const [list, settingsDoc] = await Promise.all([
      SimplePurchaseOrder.find({ createdByEmail: email })
        .select({ poNumber: 1, poType: 1, serviceProposalId: 1, jobNumber: 1 })
        .lean(),
      UserSettings.findOne({ ownerEmail: email }).lean(),
    ]);
    const prefix = effectiveShopPoNumberPrefix(mergeUserSettings(settingsDoc?.settings));
    const shopPos = (Array.isArray(list) ? list : []).filter(
      (row) => resolveSimplePoType(row) === SIMPLE_PO_TYPE_SHOP
    );
    const nextPoNumber = computeNextShopPoNumber(shopPos, prefix);
    return NextResponse.json({ nextPoNumber, prefix });
  } catch (err) {
    console.error("Dashboard next simple shop PO number error:", err);
    return NextResponse.json({ error: "Failed to get next PO number" }, { status: 500 });
  }
}
