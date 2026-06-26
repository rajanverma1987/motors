/**
 * Client-safe employee dropdown helpers (no DB / mongoose imports).
 */

/**
 * @param {Array<{ id?: string, _id?: string, name?: string, email?: string }>} employees
 * @param {string} [selectedValue] include legacy/unknown id in options
 */
export function buildEmployeeSelectOptions(employees, selectedValue = "") {
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

  const opts = [{ value: "", label: "—" }, ...list];
  const sel = String(selectedValue ?? "").trim();
  if (sel && !opts.some((o) => o.value === sel)) {
    opts.push({ value: sel, label: sel });
  }
  return opts;
}

/**
 * Dropdown options for RFQ / quote technician (mobile app assignees).
 * Only employees with technician app access are listed; the current assignee is kept if set.
 * @param {Array<{ id?: string, _id?: string, name?: string, email?: string, technicianAppAccess?: boolean }>} employees
 * @param {string} [selectedValue]
 */
export function buildTechnicianSelectOptions(employees, selectedValue = "") {
  const list = employees || [];
  const technicians = list.filter((e) => Boolean(e.technicianAppAccess));
  const sel = String(selectedValue ?? "").trim();

  if (sel && !technicians.some((e) => String(e.id ?? e._id ?? "").trim() === sel)) {
    const assigned = list.find((e) => String(e.id ?? e._id ?? "").trim() === sel);
    if (assigned) {
      return buildEmployeeSelectOptions([...technicians, assigned], sel);
    }
  }

  return buildEmployeeSelectOptions(technicians, sel);
}
