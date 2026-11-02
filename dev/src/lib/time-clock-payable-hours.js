/** Manual hours tied to a job are not payable. Payable time is punch in and punch out. */
export function payableManualHoursClause() {
  return {
    $or: [{ proposalId: "" }, { proposalId: null }, { proposalId: { $exists: false } }],
  };
}
