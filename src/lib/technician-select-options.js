/**
 * Client-safe technician dropdown helpers (no DB / mongoose imports).
 */

/**
 * Dropdown options for RFQ / quote technician (mobile app assignees).
 * @param {Array<{ id?: string, _id?: string, name?: string, email?: string }>} employees
 */
export function buildTechnicianSelectOptions(employees) {
  const list = (employees || [])
    .map((e) => {
      const id = String(e.id ?? e._id ?? "").trim();
      if (!id) return null;
      const label =
        (e.name && String(e.name).trim()) ||
        (e.email && String(e.email).trim()) ||
        id;
      return { value: id, label };
    })
    .filter(Boolean);

  return [{ value: "", label: "—" }, ...list];
}
