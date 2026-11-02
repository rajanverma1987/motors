export const INITIAL_VENDOR_FORM = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  partsSupplied: [],
  paymentTerms: "",
  notes: "",
  attachments: [],
};

/** @param {Record<string, unknown>} data */
export function vendorApiToForm(data) {
  const d = data || {};
  const parts = Array.isArray(d.partsSupplied)
    ? d.partsSupplied
        .map((p) => (typeof p === "string" ? p : p?.item ?? ""))
        .map((s) => String(s || "").trim())
        .filter(Boolean)
    : [];
  return {
    name: d.name ?? "",
    contactName: d.contactName ?? "",
    phone: d.phone ?? "",
    email: d.email ?? "",
    address: d.address ?? "",
    city: d.city ?? "",
    state: d.state ?? "",
    zipCode: d.zipCode ?? "",
    partsSupplied: parts,
    paymentTerms: d.paymentTerms ?? "",
    notes: d.notes ?? "",
    attachments: Array.isArray(d.attachments) ? d.attachments : [],
  };
}

/** @param {Record<string, unknown>} form */
export function buildVendorPayload(form) {
  const f = form || {};
  return {
    name: f.name ?? "",
    contactName: f.contactName ?? "",
    phone: f.phone ?? "",
    email: f.email ?? "",
    address: f.address ?? "",
    city: f.city ?? "",
    state: f.state ?? "",
    zipCode: f.zipCode ?? "",
    partsSupplied: Array.isArray(f.partsSupplied) ? f.partsSupplied : [],
    paymentTerms: f.paymentTerms ?? "",
    notes: f.notes ?? "",
    attachments: Array.isArray(f.attachments) ? f.attachments : [],
  };
}
