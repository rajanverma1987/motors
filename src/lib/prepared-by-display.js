import mongoose from "mongoose";
import Employee from "@/models/Employee";

const OID_HEX = /^[a-f0-9]{24}$/i;

/**
 * Invoice/quote `preparedBy` stores employee ObjectId; resolve to name for display.
 * If not a valid id or employee missing, returns the stored string (e.g. legacy name).
 */
export async function resolvePreparedByDisplay(preparedBy, ownerEmail) {
  const pb = String(preparedBy ?? "").trim();
  const owner = String(ownerEmail ?? "").trim().toLowerCase();
  if (!pb) return "";
  if (!owner || !OID_HEX.test(pb) || !mongoose.Types.ObjectId.isValid(pb)) {
    return pb;
  }
  try {
    const e = await Employee.findOne({
      _id: new mongoose.Types.ObjectId(pb),
      createdByEmail: owner,
    })
      .select("name")
      .lean();
    const n = (e?.name || "").trim();
    return n || pb;
  } catch {
    return pb;
  }
}
