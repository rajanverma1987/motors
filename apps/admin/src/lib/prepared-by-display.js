import mongoose from "mongoose";
import Employee from "@/models/Employee";
import User from "@/models/User";
import { isShopAdminSelectValue } from "@/lib/technician-select-options";

const OID_HEX = /^[a-f0-9]{24}$/i;

/**
 * Invoice/quote `preparedBy` stores employee ObjectId (or shop admin sentinel); resolve to name for display.
 * Never returns a raw ObjectId when the employee cannot be found.
 */
export async function resolvePreparedByDisplay(preparedBy, ownerEmail) {
  const pb = String(preparedBy ?? "").trim();
  const owner = String(ownerEmail ?? "").trim().toLowerCase();
  if (!pb) return "";
  if (isShopAdminSelectValue(pb)) {
    if (!owner) return "Shop Admin";
    try {
      const u = await User.findOne({ email: owner }).select("contactName shopName").lean();
      return (
        String(u?.contactName || "").trim() ||
        String(u?.shopName || "").trim() ||
        "Shop Admin"
      );
    } catch {
      return "Shop Admin";
    }
  }
  if (!owner || !OID_HEX.test(pb) || !mongoose.Types.ObjectId.isValid(pb)) {
    // Legacy plain-name value, or id-shaped string without owner context
    return OID_HEX.test(pb) ? "" : pb;
  }
  try {
    const e = await Employee.findOne({
      _id: new mongoose.Types.ObjectId(pb),
      createdByEmail: owner,
    })
      .select("name")
      .lean();
    const n = (e?.name || "").trim();
    return n || "";
  } catch {
    return "";
  }
}
