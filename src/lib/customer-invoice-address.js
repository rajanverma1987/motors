function formatPostalAddress(source, keys) {
  if (!source) return "";
  const street = String(source[keys.street] ?? "").trim();
  const city = String(source[keys.city] ?? "").trim();
  const state = String(source[keys.state] ?? "").trim();
  const zip = String(source[keys.zip] ?? source[keys.zipAlt] ?? "").trim();
  const country = String(source[keys.country] ?? "").trim();
  const lines = [];
  if (street) lines.push(street);
  const cityLine = [city, state, zip].filter(Boolean).join(", ");
  if (cityLine) lines.push(cityLine);
  if (country && country.toLowerCase() !== "united states") lines.push(country);
  return lines.join("\n");
}

/**
 * "To" block on invoices / service proposals: client name line(s) + address from Customer record.
 * Uses billing address, then shipping if billing is empty.
 */
export function customerInvoiceToBlock(customer) {
  if (!customer) {
    return { toName: "", billingAddress: "" };
  }
  const comp = String(customer.companyName ?? "").trim();
  const contact = String(customer.primaryContactName ?? "").trim();
  const email = String(customer.email ?? "").trim();
  let toName = "";
  if (comp && contact) toName = `${comp}\n${contact}`;
  else toName = comp || contact || "";
  if (email) {
    toName = toName ? `${toName}\n${email}` : email;
  }

  const billing = formatPostalAddress(customer, {
    street: "address",
    city: "city",
    state: "state",
    zip: "zipCode",
    zipAlt: "zip",
    country: "country",
  });
  const shipping = formatPostalAddress(customer, {
    street: "shippingAddress",
    city: "shippingCity",
    state: "shippingState",
    zip: "shippingZipCode",
    zipAlt: "shippingZip",
    country: "shippingCountry",
  });

  return { toName, billingAddress: billing || shipping };
}
