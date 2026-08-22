/**
 * Client-safe employee dropdown helpers (no DB / mongoose imports).
 */

function employeeOptionId(e) {
  return String(e?.id ?? e?._id ?? "").trim();
}

function employeeOptionLabel(e, fallback = "") {
  return (
    (e?.name && String(e.name).trim()) ||
    (e?.email && String(e.email).trim()) ||
    String(fallback || "").trim() ||
    "—"
  );
}

/**
 * Resolve stored employee id or legacy name to a known employee row.
 * @param {Array<{ id?: string, _id?: string, name?: string, email?: string }>} employees
 * @param {string} raw
 */
export function findEmployeeByIdOrName(employees, raw) {
  const sel = String(raw ?? "").trim();
  if (!sel) return null;
  const list = Array.isArray(employees) ? employees : [];
  const byId = list.find((e) => employeeOptionId(e) === sel);
  if (byId) return byId;
  const lower = sel.toLowerCase();
  return (
    list.find((e) => String(e?.name || "").trim().toLowerCase() === lower) ||
    list.find((e) => String(e?.email || "").trim().toLowerCase() === lower) ||
    null
  );
}

/**
 * Normalize a stored prepared-by / approved-by value to employee id when possible.
 * @param {Array<{ id?: string, _id?: string, name?: string, email?: string }>} employees
 * @param {string} raw
 */
export function resolveEmployeeSelectValue(employees, raw) {
  const sel = String(raw ?? "").trim();
  if (!sel) return "";
  const found = findEmployeeByIdOrName(employees, sel);
  return found ? employeeOptionId(found) : sel;
}

/**
 * @param {Array<{ id?: string, _id?: string, name?: string, email?: string }>} employees
 * @param {string} [selectedValue] include legacy/unknown id in options
 */
export function buildEmployeeSelectOptions(employees, selectedValue = "") {
  const list = (employees || [])
    .map((e) => {
      const id = employeeOptionId(e);
      if (!id) return null;
      return { value: id, label: employeeOptionLabel(e, id) };
    })
    .filter(Boolean);

  const opts = [{ value: "", label: "—" }, ...list];
  const sel = String(selectedValue ?? "").trim();
  if (sel && !opts.some((o) => o.value === sel)) {
    const found = findEmployeeByIdOrName(employees, sel);
    opts.push({
      value: sel,
      label: found ? employeeOptionLabel(found, sel) : "Unknown employee",
    });
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

  if (sel && !technicians.some((e) => employeeOptionId(e) === sel)) {
    const assigned = list.find((e) => employeeOptionId(e) === sel);
    if (assigned) {
      return buildEmployeeSelectOptions([...technicians, assigned], sel);
    }
  }

  return buildEmployeeSelectOptions(technicians, sel);
}
