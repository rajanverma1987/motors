/** Normalize a Quote mongoose doc (or plain object) for dashboard JSON responses. */
export function quoteToDashboardJson(doc) {
  const obj = doc && typeof doc.toObject === "function" ? doc.toObject() : doc || {};
  const id =
    doc?._id?.toString?.() ??
    obj._id?.toString?.() ??
    (obj.id != null ? String(obj.id) : "");
  return {
    ...obj,
    id,
    _id: undefined,
    technicianEmployeeId: String(
      doc?.technicianEmployeeId ?? obj.technicianEmployeeId ?? ""
    ).trim(),
  };
}
