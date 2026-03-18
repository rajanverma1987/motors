/**
 * "To" block on invoices: client name line(s) + billing address from Customer record.
 */
export function customerInvoiceToBlock(customer) {
  if (!customer) {
    return { toName: "", billingAddress: "" };
  }
  const comp = String(customer.companyName ?? "").trim();
  const contact = String(customer.primaryContactName ?? "").trim();
  let toName = "";
  if (comp && contact) toName = `${comp}\n${contact}`;
  else toName = comp || contact || "";

  const lines = [];
  const addr = String(customer.address ?? "").trim();
  if (addr) lines.push(addr);
  const city = String(customer.city ?? "").trim();
  const state = String(customer.state ?? "").trim();
  const zip = String(customer.zipCode ?? "").trim();
  const cityLine = [city, state, zip].filter(Boolean).join(", ");
  if (cityLine) lines.push(cityLine);
  const country = String(customer.country ?? "").trim();
  if (country && country.toLowerCase() !== "united states") lines.push(country);

  return { toName, billingAddress: lines.join("\n") };
}
