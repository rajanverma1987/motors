/**
 * Client-safe employee dropdown helpers (no DB / mongoose imports).
 */

const MONGO_OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

/** Synthetic select value for the shop owner (portal admin), not an Employee row. */
export const SHOP_ADMIN_SELECT_VALUE = "__shop_admin__";

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

/** True for a 24-char hex Mongo ObjectId string (never show these as display names). */
export function isMongoObjectIdString(value) {
  return MONGO_OBJECT_ID_RE.test(String(value ?? "").trim());
}

export function isShopAdminSelectValue(value) {
  return String(value ?? "").trim() === SHOP_ADMIN_SELECT_VALUE;
}

/**
 * Display label for the shop admin option.
 * @param {{ contactName?: string, shopName?: string, email?: string }|null|undefined} user
 */
export function shopAdminDisplayLabel(user) {
  return (
    String(user?.contactName || "").trim() ||
    String(user?.shopName || "").trim() ||
    "Shop Admin"
  );
}

/**
 * Synthetic employee row for the shop owner so they appear in Prepared By / Technician lists.
 * @param {{ contactName?: string, shopName?: string, email?: string }|null|undefined} user
 */
export function createShopAdminEmployeeEntry(user) {
  return {
    id: SHOP_ADMIN_SELECT_VALUE,
    _id: SHOP_ADMIN_SELECT_VALUE,
    name: shopAdminDisplayLabel(user),
    email: String(user?.email || "").trim().toLowerCase(),
    isShopAdmin: true,
  };
}

/**
 * Prepend shop admin to an employees list (idempotent).
 * @param {Array} employees
 * @param {{ contactName?: string, shopName?: string, email?: string }|null|undefined} user
 */
export function withShopAdminEmployee(employees, user) {
  const list = Array.isArray(employees) ? [...employees] : [];
  if (list.some((e) => isShopAdminSelectValue(employeeOptionId(e)) || e?.isShopAdmin)) {
    return list;
  }
  return [createShopAdminEmployeeEntry(user), ...list];
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
  if (isShopAdminSelectValue(sel)) {
    return list.find((e) => isShopAdminSelectValue(employeeOptionId(e)) || e?.isShopAdmin) || null;
  }
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
 * Select value for the currently logged-in portal user (employee id or shop admin sentinel).
 * @param {{ isOwner?: boolean, isEmployee?: boolean, authType?: string, employeeId?: string }|null|undefined} user
 * @param {Array} [employees]
 */
export function resolveLoggedInEmployeeSelectValue(user, employees = []) {
  if (!user) return "";
  const isEmployee = Boolean(
    user.isEmployee ?? (user.authType === "employee" || Boolean(user.employeeId))
  );
  if (!isEmployee || user.isOwner) {
    return SHOP_ADMIN_SELECT_VALUE;
  }
  const id = String(user.employeeId || "").trim();
  if (!id) return SHOP_ADMIN_SELECT_VALUE;
  const found = findEmployeeByIdOrName(employees, id);
  return found ? employeeOptionId(found) : id;
}

/**
 * Resolve stored preparedBy / quotedBy (employee id or legacy name) to a display name.
 * Never returns a raw Mongo ObjectId.
 * @param {Array<{ id?: string, _id?: string, name?: string, email?: string }>} employees
 * @param {string} value
 * @returns {string}
 */
export function resolveEmployeeDisplayName(employees, value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (isShopAdminSelectValue(raw)) {
    const admin = (Array.isArray(employees) ? employees : []).find(
      (e) => isShopAdminSelectValue(employeeOptionId(e)) || e?.isShopAdmin
    );
    return admin ? employeeOptionLabel(admin, "Shop Admin") : "Shop Admin";
  }
  const found = findEmployeeByIdOrName(employees, raw);
  if (found) {
    const label = employeeOptionLabel(found, "");
    if (label && label !== "—") return label;
  }
  if (isMongoObjectIdString(raw)) return "";
  return raw;
}

function listShopAdmin(employees) {
  return (Array.isArray(employees) ? employees : []).find(
    (e) => isShopAdminSelectValue(employeeOptionId(e)) || e?.isShopAdmin
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
  if (isShopAdminSelectValue(sel)) return SHOP_ADMIN_SELECT_VALUE;
  const found = findEmployeeByIdOrName(employees, sel);
  if (found) return employeeOptionId(found);
  // Legacy: shop owner stored as contact name / email matching shop admin row.
  const admin = listShopAdmin(employees);
  if (admin) {
    const adminName = String(admin.name || "").trim().toLowerCase();
    const adminEmail = String(admin.email || "").trim().toLowerCase();
    const lower = sel.toLowerCase();
    if ((adminName && lower === adminName) || (adminEmail && lower === adminEmail)) {
      return SHOP_ADMIN_SELECT_VALUE;
    }
  }
  return sel;
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
      value: isShopAdminSelectValue(sel) ? SHOP_ADMIN_SELECT_VALUE : sel,
      label: found
        ? employeeOptionLabel(found, sel)
        : isShopAdminSelectValue(sel)
          ? "Shop Admin"
          : isMongoObjectIdString(sel)
            ? "Unknown employee"
            : sel,
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
