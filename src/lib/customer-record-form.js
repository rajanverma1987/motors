export const INITIAL_CUSTOMER_FORM = {
  companyName: "",
  primaryContactName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: "United States",
  shippingAddress: "",
  shippingCity: "",
  shippingState: "",
  shippingZipCode: "",
  shippingCountry: "United States",
  additionalContacts: [],
  notes: "",
  ein: "",
  creditLimit: "",
  taxExempt: true,
  taxPercent: "",
};

/** @param {Record<string, unknown>} data */
export function customerApiToForm(data) {
  const d = data || {};
  return {
    companyName: d.companyName ?? "",
    primaryContactName: d.primaryContactName ?? "",
    phone: d.phone ?? "",
    email: d.email ?? "",
    address: d.address ?? "",
    city: d.city ?? "",
    state: d.state ?? "",
    zipCode: d.zipCode ?? "",
    country: d.country ?? "United States",
    shippingAddress: d.shippingAddress ?? "",
    shippingCity: d.shippingCity ?? "",
    shippingState: d.shippingState ?? "",
    shippingZipCode: d.shippingZipCode ?? "",
    shippingCountry: d.shippingCountry ?? "United States",
    additionalContacts: Array.isArray(d.additionalContacts)
      ? d.additionalContacts.map((ac) => ({
          contactName: ac.contactName ?? "",
          phone: ac.phone ?? "",
          email: ac.email ?? "",
        }))
      : [],
    notes: d.notes ?? "",
    ein: d.ein ?? "",
    creditLimit: d.creditLimit ?? "",
    taxExempt: d.taxExempt !== false,
    taxPercent: d.taxPercent ?? "",
  };
}

export function buildCustomerPayload(form) {
  const f = form || {};
  return {
    companyName: f.companyName ?? "",
    primaryContactName: f.primaryContactName ?? "",
    phone: f.phone ?? "",
    email: f.email ?? "",
    address: f.address ?? "",
    city: f.city ?? "",
    state: f.state ?? "",
    zipCode: f.zipCode ?? "",
    country: f.country ?? "United States",
    shippingAddress: f.shippingAddress ?? "",
    shippingCity: f.shippingCity ?? "",
    shippingState: f.shippingState ?? "",
    shippingZipCode: f.shippingZipCode ?? "",
    shippingCountry: f.shippingCountry ?? "United States",
    additionalContacts: Array.isArray(f.additionalContacts) ? f.additionalContacts : [],
    notes: f.notes ?? "",
    ein: f.ein ?? "",
    creditLimit: f.creditLimit ?? "",
    taxExempt: !!f.taxExempt,
    taxPercent: f.taxExempt ? "" : (f.taxPercent ?? ""),
  };
}
