import { formatCustomerNumber } from "@/lib/format-customer-number";

export { formatCustomerNumber };

export const CUSTOMER_TYPE_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "Commercial", label: "Commercial" },
  { value: "Industrial", label: "Industrial" },
  { value: "Residential", label: "Residential" },
  { value: "Government", label: "Government" },
  { value: "OEM", label: "OEM" },
  { value: "Other", label: "Other" },
];

export const PAYMENT_TERMS_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "Due on receipt", label: "Due on receipt" },
  { value: "NET 15", label: "NET 15" },
  { value: "NET 30", label: "NET 30" },
  { value: "NET 45", label: "NET 45" },
  { value: "NET 60", label: "NET 60" },
];

export const PREFERRED_PAYMENT_METHOD_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "Cash", label: "Cash" },
  { value: "Check", label: "Check" },
  { value: "Credit Card", label: "Credit Card" },
  { value: "ACH", label: "ACH" },
  { value: "Wire", label: "Wire" },
  { value: "Other", label: "Other" },
];

export const PREFERRED_CONTACT_METHOD_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "Email", label: "Email" },
  { value: "Phone", label: "Phone" },
  { value: "Fax", label: "Fax" },
  { value: "Text", label: "Text" },
];

const DEFAULT_CUSTOMER_COUNTRY = "South Africa";

export const INITIAL_CUSTOMER_FORM = {
  customerNumber: "",
  companyName: "",
  primaryContactName: "",
  phone: "",
  fax: "",
  email: "",
  alternatePhone: "",
  alternateEmail: "",
  billingContact: "",
  customerType: "",
  paymentTerms: "",
  preferredPaymentMethod: "",
  preferredContactMethod: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: DEFAULT_CUSTOMER_COUNTRY,
  shippingAddress: "",
  shippingCity: "",
  shippingState: "",
  shippingZipCode: "",
  shippingCountry: DEFAULT_CUSTOMER_COUNTRY,
  additionalContacts: [],
  documents: [],
  notes: "",
  ein: "",
  creditLimit: "",
  taxExempt: true,
  taxPercent: "",
};

function normalizeDocuments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((d) => ({
    name: String(d?.name ?? d?.documentName ?? "").trim(),
    url: String(d?.url ?? d?.path ?? d?.documents ?? "").trim(),
  }));
}

/** Persist only uploaded docs (with url). Pending local File rows are uploaded after create. */
export function documentsForPayload(raw) {
  return normalizeDocuments(raw).filter((d) => d.url);
}

export async function uploadCustomerDocumentFiles(customerId, pendingDocs) {
  const id = String(customerId || "").trim();
  const list = Array.isArray(pendingDocs) ? pendingDocs.filter((d) => d?._pendingFile) : [];
  if (!id || list.length === 0) return null;
  const body = new FormData();
  for (const d of list) {
    body.append("files", d._pendingFile);
    body.append("documentNames", String(d.name || d._pendingFile.name || "Document").trim());
  }
  const res = await fetch(`/api/dashboard/customers/${encodeURIComponent(id)}/documents`, {
    method: "POST",
    credentials: "include",
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Document upload failed");
  return Array.isArray(data.documents) ? data.documents : [];
}

export async function deleteCustomerDocumentFile(customerId, url) {
  const id = String(customerId || "").trim();
  const documentUrl = String(url || "").trim();
  if (!id || !documentUrl) throw new Error("Document url is required");
  const res = await fetch(`/api/dashboard/customers/${encodeURIComponent(id)}/documents`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: documentUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Document delete failed");
  return Array.isArray(data.documents) ? data.documents : [];
}

export function resolveCustomerDocumentHref(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/")) return u;
  return `/${u}`;
}

/** @param {Record<string, unknown>} data */
export function customerApiToForm(data) {
  const d = data || {};
  return {
    customerNumber: formatCustomerNumber(d.customerNumber),
    companyName: d.companyName ?? "",
    primaryContactName: d.primaryContactName ?? "",
    phone: d.phone ?? "",
    fax: d.fax ?? "",
    email: d.email ?? "",
    alternatePhone: d.alternatePhone ?? "",
    alternateEmail: d.alternateEmail ?? "",
    billingContact: d.billingContact ?? "",
    customerType: d.customerType ?? "",
    paymentTerms: d.paymentTerms ?? "",
    preferredPaymentMethod: d.preferredPaymentMethod ?? "",
    preferredContactMethod: d.preferredContactMethod ?? "",
    address: d.address ?? "",
    city: d.city ?? "",
    state: d.state ?? "",
    zipCode: d.zipCode ?? "",
    country: d.country ?? DEFAULT_CUSTOMER_COUNTRY,
    shippingAddress: d.shippingAddress ?? "",
    shippingCity: d.shippingCity ?? "",
    shippingState: d.shippingState ?? "",
    shippingZipCode: d.shippingZipCode ?? "",
    shippingCountry: d.shippingCountry ?? DEFAULT_CUSTOMER_COUNTRY,
    additionalContacts: Array.isArray(d.additionalContacts)
      ? d.additionalContacts.map((ac) => ({
          contactName: ac.contactName ?? "",
          phone: ac.phone ?? "",
          email: ac.email ?? "",
        }))
      : [],
    documents: normalizeDocuments(d.documents),
    notes: d.notes ?? "",
    ein: d.ein ?? "",
    creditLimit: d.creditLimit ?? "",
    taxExempt: d.taxExempt !== false,
    taxPercent: d.taxPercent ?? "",
  };
}

/** Primary contact plus additional contacts, for picking a job contact. */
export function listCustomerJobContacts(customer) {
  if (!customer) return [];
  const contacts = [];
  const primaryName = String(customer.primaryContactName || "").trim();
  const primaryEmail = String(customer.email || "").trim();
  const primaryPhone = String(customer.phone || "").trim();
  if (primaryName || primaryEmail || primaryPhone) {
    contacts.push({
      key: "primary",
      name: primaryName || "Primary contact",
      printName: primaryName,
      email: primaryEmail,
      phone: primaryPhone,
    });
  }
  const extras = Array.isArray(customer.additionalContacts) ? customer.additionalContacts : [];
  extras.forEach((ac, index) => {
    const name = String(ac?.contactName || "").trim();
    const email = String(ac?.email || "").trim();
    const phone = String(ac?.phone || "").trim();
    if (!name && !email && !phone) return;
    contacts.push({
      key: `extra:${index}`,
      name: name || `Contact ${index + 1}`,
      printName: name,
      email,
      phone,
    });
  });
  return contacts;
}

/** Contact chosen on the quotation, or the one matching its email and phone. */
export function resolveCustomerJobContact(customer, form) {
  const contacts = listCustomerJobContacts(customer);
  if (!contacts.length) return null;
  const key = String(form?.jobContactKey || "").trim();
  if (key) {
    const byKey = contacts.find((row) => row.key === key);
    if (byKey) return byKey;
  }
  const email = String(form?.customerEmail || "").trim().toLowerCase();
  const phone = String(form?.customerPhone || "").trim();
  if (email || phone) {
    const match = contacts.find((row) => {
      const sameEmail = !email || row.email.toLowerCase() === email;
      const samePhone = !phone || row.phone === phone;
      return sameEmail && samePhone && (email ? row.email.toLowerCase() === email : true);
    });
    if (match) return match;
    if (email) {
      const byEmail = contacts.find((row) => row.email.toLowerCase() === email);
      if (byEmail) return byEmail;
    }
  }
  return null;
}

export function buildCustomerPayload(form) {
  const f = form || {};
  return {
    customerNumber: formatCustomerNumber(f.customerNumber),
    companyName: f.companyName ?? "",
    primaryContactName: f.primaryContactName ?? "",
    phone: f.phone ?? "",
    fax: f.fax ?? "",
    email: f.email ?? "",
    alternatePhone: f.alternatePhone ?? "",
    alternateEmail: f.alternateEmail ?? "",
    billingContact: f.billingContact ?? "",
    customerType: f.customerType ?? "",
    paymentTerms: f.paymentTerms ?? "",
    preferredPaymentMethod: f.preferredPaymentMethod ?? "",
    preferredContactMethod: f.preferredContactMethod ?? "",
    address: f.address ?? "",
    city: f.city ?? "",
    state: f.state ?? "",
    zipCode: f.zipCode ?? "",
    country: f.country ?? DEFAULT_CUSTOMER_COUNTRY,
    shippingAddress: f.shippingAddress ?? "",
    shippingCity: f.shippingCity ?? "",
    shippingState: f.shippingState ?? "",
    shippingZipCode: f.shippingZipCode ?? "",
    shippingCountry: f.shippingCountry ?? DEFAULT_CUSTOMER_COUNTRY,
    additionalContacts: Array.isArray(f.additionalContacts) ? f.additionalContacts : [],
    documents: documentsForPayload(f.documents),
    notes: f.notes ?? "",
    ein: f.ein ?? "",
    creditLimit: f.creditLimit ?? "",
    taxExempt: !!f.taxExempt,
    taxPercent: f.taxExempt ? "" : (f.taxPercent ?? ""),
  };
}
