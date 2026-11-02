/**
 * Map between Quotes-style scope/parts tables and MotorRepairFlowQuote lineItems.
 */

export function preliminaryLineItemsToScopeLines(lineItems) {
  return (lineItems || []).map((li) => {
    const qty = Number(li.quantity);
    const up = Number(li.unitPrice);
    const tot = (Number.isFinite(qty) ? qty : 1) * (Number.isFinite(up) ? up : 0);
    const scopeParts = [String(li.description || "").trim()].filter(Boolean);
    if (li.subjectToTeardown) scopeParts.push("(Subject to disassembly)");
    if (li.notes) scopeParts.push(`— ${li.notes}`);
    return {
      scope: scopeParts.join(" "),
      price: tot !== 0 ? String(tot) : String(Number.isFinite(up) ? up : ""),
    };
  });
}

/**
 * @returns {Array<{ description: string, quantity: number, unitPrice: number, notes: string, subjectToTeardown: boolean }>}
 */
export function scopeAndPartsToFlowLineItems(scopeLines, partsLines) {
  const out = [];
  for (const row of scopeLines || []) {
    const rawScope = String(row?.scope ?? "").trim();
    if (!rawScope) continue;
    const price = parseFloat(row?.price);
    const stripped = rawScope
      .replace(/\s*\(Subject to teardown\)\s*/gi, " ")
      .replace(/\s*\(Subject to disassembly\)\s*/gi, " ")
      .trim();
    out.push({
      description: stripped || rawScope,
      quantity: 1,
      unitPrice: Number.isFinite(price) ? price : 0,
      notes: "",
      subjectToTeardown: /subject to (teardown|disassembly)/i.test(rawScope),
    });
  }
  for (const row of partsLines || []) {
    const item = String(row?.item ?? "").trim();
    if (!item) continue;
    const qty = parseFloat(row?.qty ?? "1");
    const price = parseFloat(row?.price ?? "0");
    const uom = String(row?.uom ?? "").trim();
    out.push({
      description: uom ? `${item} (${uom})` : item,
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      unitPrice: Number.isFinite(price) ? price : 0,
      notes: "",
      subjectToTeardown: false,
    });
  }
  return out;
}
