/** Records still shown on the normal lists. */
export function notRemovedClause() {
  return { $or: [{ removedAt: null }, { removedAt: { $exists: false } }] };
}

/** Records hidden from the lists and shown in Deleted. */
export function removedClause() {
  return { removedAt: { $type: "date" } };
}
