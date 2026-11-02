/** Inventory cost, markup, and sell-price helpers (Simple portal). */

export function roundInventoryMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function parseInventoryMoney(value) {
  const n = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function parseMarkupPercent(value) {
  const n = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.min(1000, Math.max(0, n));
}

/** sell = cost × (1 + markup%/100) */
export function sellUnitPriceFromCostMarkup(unitCost, markupPercent) {
  const cost = Math.max(0, parseInventoryMoney(unitCost));
  const markup = parseMarkupPercent(markupPercent);
  return roundInventoryMoney(cost * (1 + markup / 100));
}

/**
 * Weighted average unit cost after receiving stock.
 * @param {number} onHand
 * @param {number} oldUnitCost
 * @param {number} receivedQty
 * @param {number} receivedUnitCost
 */
export function weightedAverageUnitCost(onHand, oldUnitCost, receivedQty, receivedUnitCost) {
  const hand = Math.max(0, Number(onHand) || 0);
  const recv = Math.max(0, Number(receivedQty) || 0);
  const oldCost = Math.max(0, parseInventoryMoney(oldUnitCost));
  const recvCost = Math.max(0, parseInventoryMoney(receivedUnitCost));
  const totalQty = hand + recv;
  if (totalQty <= 0) return roundInventoryMoney(recvCost || oldCost);
  if (hand <= 0) return roundInventoryMoney(recvCost);
  if (recv <= 0) return roundInventoryMoney(oldCost);
  return roundInventoryMoney((hand * oldCost + recv * recvCost) / totalQty);
}

export function formatSellPriceForLine(unitCost, markupPercent) {
  const sell = sellUnitPriceFromCostMarkup(unitCost, markupPercent);
  if (sell <= 0) return "";
  return String(sell);
}
