import Customer from "@/models/Customer";
import { formatCustomerNumber } from "@/lib/format-customer-number";

export { formatCustomerNumber };

/**
 * Next shop-facing customer number (numeric sequence, no leading zeros).
 * Uses the highest existing digits so mixed values like "9" and "010" stay in one sequence.
 * @param {string} shopEmail
 * @returns {Promise<string>}
 */
export async function nextCustomerNumberForShop(shopEmail) {
  const email = String(shopEmail || "").trim().toLowerCase();
  if (!email) return "1";
  const rows = await Customer.find({ createdByEmail: email }).select("customerNumber").lean();
  let max = 0;
  for (const row of rows) {
    const num = parseInt(String(row.customerNumber || "").replace(/\D/g, ""), 10);
    if (Number.isFinite(num) && num > max) max = num;
  }
  return String(max + 1);
}
