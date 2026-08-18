import { accountsPaymentTermsLabel } from "@/lib/accounts-display";
import { customerInvoiceToBlock } from "@/lib/customer-invoice-address";
import { RECORD_TYPE_INVOICE, parseMoneyInput, sumLinePrices } from "@/lib/simple-service-proposal-form";

export const PRINT_NOTES_INTERNAL = "internal";
export const PRINT_NOTES_CUSTOMER = "customer";

function linePrice(line) {
  return parseMoneyInput(line?.price);
}

function employeeDisplayName(employees, id) {
  const key = String(id || "").trim();
  if (!key) return "";
  const list = Array.isArray(employees) ? employees : [];
  const row = list.find((e) => String(e.id || e._id || "").trim() === key);
  if (!row) return key;
  return (
    String(row.name || row.fullName || row.displayName || "").trim() ||
    [row.firstName, row.lastName].filter(Boolean).join(" ").trim() ||
    key
  );
}

function motorLinesFromForm(form) {
  const identityLine = [form?.manufacturer, form?.modelNumber]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(" · ");
  const specsLine = [
    form?.hpKw ? `${String(form.hpKw).trim()} HP/KW` : "",
    form?.volts ? `${String(form.volts).trim()}V` : "",
    form?.rpm ? `${String(form.rpm).trim()} RPM` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const detailsLine = [
    form?.sl ? `Slots: ${String(form.sl).trim()}` : "",
    form?.cl ? `Core Length: ${String(form.cl).trim()}` : "",
    form?.cd ? `Core Diameter: ${String(form.cd).trim()}` : "",
    form?.bars ? `Bars: ${String(form.bars).trim()}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const motorType = String(form?.motorPower || "").trim();
  return {
    identityLine,
    specsLine,
    detailsLine,
    motorType,
    motorLabel: identityLine || motorType || "",
  };
}

function scopeLinesFromForm(form) {
  return (Array.isArray(form?.scopeDetails) ? form.scopeDetails : [])
    .filter((line) => String(line?.description ?? "").trim() || String(line?.price ?? "").trim())
    .map((line) => ({
      scope: String(line.description || "").trim(),
      price: String(line.price ?? "").trim(),
    }));
}

function partsLinesFromForm(form) {
  return (Array.isArray(form?.otherItems) ? form.otherItems : [])
    .filter((line) => String(line?.description ?? "").trim() || String(line?.price ?? "").trim())
    .map((line) => ({
      item: String(line.description || "").trim(),
      qty: "1",
      uom: String(line.uom || "").trim(),
      price: String(line.price ?? "").trim(),
    }));
}

/**
 * Build Classic-compatible quote or invoice print payload from a Simple form snapshot.
 * @param {object} opts
 * @param {Record<string, unknown>} opts.form
 * @param {object|null} opts.customer
 * @param {object[]} [opts.employees]
 * @param {object} [opts.accountSettings]
 * @param {object|null} [opts.user] — auth user (shopName, contactName, email)
 * @param {'internal'|'customer'} [opts.notesMode]
 */
export function buildSimpleServiceProposalPrintBundle({
  form,
  customer = null,
  employees = [],
  accountSettings = {},
  user = null,
  notesMode = PRINT_NOTES_CUSTOMER,
}) {
  const isInvoice = String(form?.recordType || "").toUpperCase() === RECORD_TYPE_INVOICE;
  const documentType = isInvoice ? "invoice" : "quote";
  const { toName: customerToName, billingAddress: customerBillingAddress } = customerInvoiceToBlock(customer);
  const motor = motorLinesFromForm(form);
  const scopeLines = scopeLinesFromForm(form);
  const partsLines = partsLinesFromForm(form);
  const laborTotal = sumLinePrices(form?.scopeDetails);
  const partsTotal = sumLinePrices(form?.otherItems);
  const preparedByDisplay = employeeDisplayName(employees, form?.preparedBy);
  const fromShopName = String(user?.shopName || "").trim();
  const fromShopContact = [user?.contactName, user?.email].filter(Boolean).join(" · ") || "";
  const fromShopLogoUrl = String(accountSettings?.logoUrl || "").trim();
  const logoDocumentScale = accountSettings?.logoDocumentScale;
  const fromBillingAddress = String(accountSettings?.accountsBillingAddress || "").trim();
  const fromShippingAddress = String(accountSettings?.accountsShippingAddress || "").trim();
  const fromPaymentTermsLabel = accountsPaymentTermsLabel(accountSettings?.accountsPaymentTerms);
  const invoicePaymentOptions = String(accountSettings?.invoicePaymentOptions || "").trim();
  const invoiceThankYouNote = String(accountSettings?.invoiceThankYouNote || "").trim();
  const documentNumber = String(form?.documentNumber || "").trim();
  const notes = String(form?.internalNotes || "").trim();
  const customerNotes = String(form?.customerNotes || "").trim();
  const printNotesMode = notesMode === PRINT_NOTES_INTERNAL ? PRINT_NOTES_INTERNAL : PRINT_NOTES_CUSTOMER;

  const baseDoc = {
    rfqNumber: documentNumber,
    invoiceNumber: documentNumber,
    customerPo: String(form?.customerPo || "").trim(),
    date: String(form?.dateCreated || "").trim(),
    preparedBy: String(form?.preparedBy || "").trim(),
    preparedByDisplay,
    estimatedCompletion: String(form?.dueDate || "").trim(),
    scopeLines,
    partsLines,
    laborTotal: laborTotal ? String(laborTotal) : "",
    partsTotal: partsTotal ? String(partsTotal) : "",
    customerTaxExempt: form?.customerTaxExempt !== false,
    customerTaxPercent: String(form?.taxPercent ?? "").trim(),
    notes,
    customerNotes,
    printNotesMode,
    motorIdentityLine: motor.identityLine,
    motorSpecsLine: motor.specsLine,
    motorDetailsLine: motor.detailsLine,
    motorType: motor.motorType,
    motorLabel: motor.motorLabel,
    customerToName,
    customerBillingAddress,
    fromShopName,
    fromShopContact,
    fromShopLogoUrl,
    logoDocumentScale,
    fromBillingAddress,
    fromShippingAddress,
    fromPaymentTermsLabel,
    invoicePaymentOptions,
    invoiceThankYouNote,
  };

  if (documentType === "invoice") {
    return {
      documentType,
      printNotesMode,
      documentLabel: documentNumber ? `Invoice# ${documentNumber}` : "Invoice",
      quote: null,
      invoicePayload: {
        invoice: baseDoc,
        motorLabel: motor.motorLabel,
        fromShopName,
        fromShopContact,
        fromShopLogoUrl,
        logoDocumentScale,
        fromBillingAddress,
        fromShippingAddress,
        fromPaymentTermsLabel,
        customerToName,
        customerBillingAddress,
        invoicePaymentOptions,
        invoiceThankYouNote,
        printNotesMode,
      },
    };
  }

  return {
    documentType,
    printNotesMode,
    documentLabel: documentNumber ? `RFQ# ${documentNumber}` : "Service proposal",
    quote: baseDoc,
    invoicePayload: null,
  };
}

/** Cheap line total helper for email summary (unused numbers kept as Number). */
export function simplePrintLineSubtotal(form) {
  return sumLinePrices(form?.scopeDetails) + sumLinePrices(form?.otherItems) + (linePrice({ price: 0 }) && 0);
}
