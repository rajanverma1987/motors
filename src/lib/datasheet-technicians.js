/** Stored on a datasheet when the job should show for every technician in Punchin. */
export const DATASHEET_TECHNICIAN_ALL = "__all__";

function pushId(list, raw) {
  const id = String(raw || "").trim();
  if (!id || list.includes(id)) return;
  list.push(id);
}

/** Selected technician ids. "__all__" means every technician. */
export function datasheetTechnicianIds(sheet) {
  const list = [];
  const techs = sheet?.technicians;
  if (Array.isArray(techs)) {
    for (const item of techs) pushId(list, item);
  }
  const single = sheet?.technician;
  if (Array.isArray(single)) {
    for (const item of single) pushId(list, item);
  } else {
    pushId(list, single);
  }
  if (list.includes(DATASHEET_TECHNICIAN_ALL)) return [DATASHEET_TECHNICIAN_ALL];
  return list;
}

/** Keep the legacy string field and the id list in sync. */
export function datasheetTechniciansForSave(ids) {
  const list = datasheetTechnicianIds({ technicians: ids });
  if (list.includes(DATASHEET_TECHNICIAN_ALL)) {
    return { technician: DATASHEET_TECHNICIAN_ALL, technicians: [DATASHEET_TECHNICIAN_ALL] };
  }
  return { technician: list[0] || "", technicians: list };
}

/**
 * After a multi-select toggle, All replaces individual names, and a name replaces All.
 * @param {string[]|string} previous
 * @param {string[]} next
 */
export function reconcileDatasheetTechnicians(previous, next) {
  const prevIds = datasheetTechnicianIds({ technicians: previous });
  const nextIds = datasheetTechnicianIds({ technicians: next });
  const added = nextIds.filter((id) => !prevIds.includes(id));
  if (added.includes(DATASHEET_TECHNICIAN_ALL)) return [DATASHEET_TECHNICIAN_ALL];
  if (prevIds.includes(DATASHEET_TECHNICIAN_ALL)) {
    return added.filter((id) => id !== DATASHEET_TECHNICIAN_ALL);
  }
  return nextIds.filter((id) => id !== DATASHEET_TECHNICIAN_ALL);
}

export function datasheetTechnicianLabel(ids, options = []) {
  const list = datasheetTechnicianIds({ technicians: ids });
  if (!list.length) return "";
  if (list.includes(DATASHEET_TECHNICIAN_ALL)) return "All";
  const opts = Array.isArray(options) ? options : [];
  return list
    .map((id) => {
      const match = opts.find((option) => String(option.value) === id || String(option.label) === id);
      return match?.label || id;
    })
    .join(", ");
}

export function technicianSheetMatchesEmployee(sheet, employeeId) {
  const ids = datasheetTechnicianIds(sheet);
  const emp = String(employeeId || "").trim();
  if (!emp || !ids.length) return false;
  if (ids.includes(DATASHEET_TECHNICIAN_ALL)) return true;
  const lower = emp.toLowerCase();
  return ids.some((id) => id === emp || id.toLowerCase() === lower);
}
