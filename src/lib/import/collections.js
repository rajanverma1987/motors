import Customer from "@/models/Customer";
import Motor from "@/models/Motor";
import Quote from "@/models/Quote";
import WorkOrder from "@/models/WorkOrder";
import Invoice from "@/models/Invoice";
import Vendor from "@/models/Vendor";
import InventoryItem from "@/models/InventoryItem";
import PurchaseOrder from "@/models/PurchaseOrder";
import MotorRepairJob from "@/models/MotorRepairJob";
import MotorRepairFlowQuote from "@/models/MotorRepairFlowQuote";
import MotorRepairInspection from "@/models/MotorRepairInspection";
import Employee from "@/models/Employee";
import SalesPerson from "@/models/SalesPerson";
import SalesCommission from "@/models/SalesCommission";
import { parseCsv, toCsv } from "@/lib/import/csv";

function s(v) {
  return String(v ?? "").trim();
}
function n(v, fallback = 0) {
  const x = Number(String(v ?? "").trim());
  return Number.isFinite(x) ? x : fallback;
}

/** Empty string returns defaultValue; otherwise true/false from common CSV tokens. */
function boolish(v, defaultValue = false) {
  const t = s(v).toLowerCase();
  if (!t) return defaultValue;
  if (t === "false" || t === "no" || t === "0" || t === "n") return false;
  if (t === "true" || t === "yes" || t === "1" || t === "y") return true;
  return defaultValue;
}

function parseJsonArrayField(raw, fieldName) {
  const txt = s(raw);
  if (!txt) return [];
  let parsed;
  try {
    parsed = JSON.parse(txt);
  } catch {
    throw new Error(`${fieldName} must be valid JSON array`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${fieldName} must be a JSON array`);
  }
  return parsed;
}
function key(sourceSystem, externalRef) {
  return `${s(sourceSystem).toLowerCase()}::${s(externalRef).toLowerCase()}`;
}

const BASE_HEADERS = ["source_system", "external_ref"];

const IMPORT_COLLECTIONS = {
  customers: {
    label: "Customers",
    model: Customer,
    headers: [
      ...BASE_HEADERS,
      "company_name",
      "primary_contact_name",
      "phone",
      "email",
      "address",
      "city",
      "state",
      "zip_code",
      "country",
      "shipping_address",
      "shipping_city",
      "shipping_state",
      "shipping_zip_code",
      "shipping_country",
      "ein",
      "credit_limit",
      "tax_exempt",
      "tax_percent",
      "notes",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "CUST-1001",
      company_name: "Acme Pumps",
      primary_contact_name: "John Smith",
      phone: "+1 713 555 0101",
      email: "john@acmepumps.com",
      address: "123 Main St",
      city: "Houston",
      state: "Texas",
      zip_code: "77001",
      country: "United States",
      shipping_address: "Warehouse 2, 456 Shipping Ln",
      shipping_city: "Houston",
      shipping_state: "Texas",
      shipping_zip_code: "77002",
      shipping_country: "United States",
      ein: "12-3456789",
      credit_limit: "50000.00",
      tax_exempt: "true",
      tax_percent: "0",
      notes: "Priority account",
    },
    buildPayload: (r, ctx) => ({
      createdByEmail: ctx.ownerEmail,
      sourceSystem: s(r.source_system || "manual_csv"),
      externalRef: s(r.external_ref),
      companyName: s(r.company_name),
      primaryContactName: s(r.primary_contact_name),
      phone: s(r.phone),
      email: s(r.email).toLowerCase(),
      address: s(r.address),
      city: s(r.city),
      state: s(r.state),
      zipCode: s(r.zip_code),
      country: s(r.country || "United States"),
      shippingAddress: s(r.shipping_address),
      shippingCity: s(r.shipping_city),
      shippingState: s(r.shipping_state),
      shippingZipCode: s(r.shipping_zip_code),
      shippingCountry: s(r.shipping_country || "United States"),
      ein: s(r.ein),
      creditLimit: s(r.credit_limit),
      taxExempt: boolish(r.tax_exempt, true),
      taxPercent: s(r.tax_percent || "0"),
      notes: s(r.notes),
      importBatchId: ctx.batchId,
      importedAt: new Date(),
      importStatus: "imported",
    }),
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.company_name)) errs.push("company_name is required");
      return errs;
    },
  },
  customerAdditionalContacts: {
    label: "Customer Additional Contacts",
    model: Customer,
    skipModelValidation: true,
    headers: [
      ...BASE_HEADERS,
      "customer_external_ref",
      "customer_source_system",
      "contact_name",
      "phone",
      "email",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "CAC-1001",
      customer_external_ref: "CUST-1001",
      customer_source_system: "manual_csv",
      contact_name: "Jane Roe",
      phone: "+1 713 555 0102",
      email: "jane@acmepumps.com",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.customer_external_ref)) errs.push("customer_external_ref is required");
      if (!s(r.contact_name)) errs.push("contact_name is required");
      return errs;
    },
    buildPayload: (r, ctx) => {
      const customerId = ctx.resolveRef("customers", s(r.customer_source_system || "manual_csv"), s(r.customer_external_ref));
      if (!customerId) throw new Error("customer_external_ref not found");
      return {
        customerId,
        contact: {
          contactName: s(r.contact_name),
          phone: s(r.phone),
          email: s(r.email).toLowerCase(),
        },
      };
    },
    importRow: async ({ payload, ownerEmail }) => {
      const customer = await Customer.findOne({ _id: payload.customerId, createdByEmail: ownerEmail }).lean();
      if (!customer) throw new Error("Customer not found for additional contact");
      const existing = Array.isArray(customer.additionalContacts) ? customer.additionalContacts : [];
      const already = existing.some(
        (x) =>
          s(x?.contactName).toLowerCase() === s(payload.contact.contactName).toLowerCase() &&
          s(x?.phone) === s(payload.contact.phone) &&
          s(x?.email).toLowerCase() === s(payload.contact.email).toLowerCase(),
      );
      const nextContacts = already ? existing : [...existing, payload.contact];
      await Customer.updateOne(
        { _id: payload.customerId, createdByEmail: ownerEmail },
        { $set: { additionalContacts: nextContacts } },
      );
      return { imported: true };
    },
  },
  motors: {
    label: "Motors",
    model: Motor,
    headers: [
      ...BASE_HEADERS,
      "customer_external_ref",
      "customer_source_system",
      "serial_number",
      "manufacturer",
      "model",
      "hp",
      "kw",
      "rpm",
      "voltage",
      "amps",
      "motor_type",
      "slots",
      "frame_size",
      "core_length",
      "core_diameter",
      "bars",
      "notes",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "MTR-0001",
      customer_external_ref: "CUST-1001",
      customer_source_system: "manual_csv",
      serial_number: "SN-19092",
      manufacturer: "ABB",
      model: "M3BP",
      hp: "50",
      kw: "37",
      rpm: "1780",
      voltage: "460",
      amps: "59.3",
      motor_type: "AC",
      slots: "36",
      frame_size: "326T",
      core_length: "8.5",
      core_diameter: "6.2",
      bars: "",
      notes: "",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.customer_external_ref)) errs.push("customer_external_ref is required");
      return errs;
    },
    buildPayload: (r, ctx) => {
      const customerId = ctx.resolveRef("customers", s(r.customer_source_system || "manual_csv"), s(r.customer_external_ref));
      if (!customerId) throw new Error("customer_external_ref not found");
      return {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        customerId,
        customerExternalRef: s(r.customer_external_ref),
        customerSourceSystem: s(r.customer_source_system || "manual_csv"),
        serialNumber: s(r.serial_number),
        manufacturer: s(r.manufacturer),
        model: s(r.model),
        hp: s(r.hp),
        kw: s(r.kw),
        rpm: s(r.rpm),
        voltage: s(r.voltage),
        amps: s(r.amps),
        motorType: s(r.motor_type),
        slots: s(r.slots),
        frameSize: s(r.frame_size),
        coreLength: s(r.core_length),
        coreDiameter: s(r.core_diameter),
        bars: s(r.bars),
        notes: s(r.notes),
        importBatchId: ctx.batchId,
        importedAt: new Date(),
        importStatus: "imported",
      };
    },
  },
  quotes: {
    label: "Quotes",
    model: Quote,
    headers: [
      ...BASE_HEADERS,
      "customer_external_ref",
      "customer_source_system",
      "motor_external_ref",
      "motor_source_system",
      "rfq_number",
      "date",
      "status",
      "status_options_hint",
      "customer_po",
      "prepared_by",
      "estimated_completion",
      "customer_notes",
      "labor_total",
      "parts_total",
      "notes",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "QT-3001",
      customer_external_ref: "CUST-1001",
      customer_source_system: "manual_csv",
      motor_external_ref: "MTR-0001",
      motor_source_system: "manual_csv",
      rfq_number: "A00001",
      date: "2026-04-28",
      status: "draft",
      status_options_hint: "draft|sent|approved|rejected|rnr",
      customer_po: "PO-9001",
      prepared_by: "Mike Turner",
      estimated_completion: "2026-05-03",
      customer_notes: "Standard lead time applies.",
      labor_total: "1200",
      parts_total: "650",
      notes: "",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.customer_external_ref)) errs.push("customer_external_ref is required");
      if (!s(r.motor_external_ref)) errs.push("motor_external_ref is required");
      return errs;
    },
    buildPayload: (r, ctx) => {
      const customerId = ctx.resolveRef("customers", s(r.customer_source_system || "manual_csv"), s(r.customer_external_ref));
      if (!customerId) throw new Error("customer_external_ref not found");
      const motorId = ctx.resolveRef("motors", s(r.motor_source_system || "manual_csv"), s(r.motor_external_ref));
      if (!motorId) throw new Error("motor_external_ref not found");
      return {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        customerId,
        customerExternalRef: s(r.customer_external_ref),
        customerSourceSystem: s(r.customer_source_system || "manual_csv"),
        motorId,
        motorExternalRef: s(r.motor_external_ref),
        motorSourceSystem: s(r.motor_source_system || "manual_csv"),
        rfqNumber: s(r.rfq_number),
        date: s(r.date),
        status: s(r.status || "draft"),
        customerPo: s(r.customer_po),
        preparedBy: s(r.prepared_by),
        estimatedCompletion: s(r.estimated_completion),
        customerNotes: s(r.customer_notes),
        laborTotal: s(r.labor_total),
        partsTotal: s(r.parts_total),
        notes: s(r.notes),
        importBatchId: ctx.batchId,
        importedAt: new Date(),
        importStatus: "imported",
      };
    },
  },
  quoteScopeLines: {
    label: "Quote Scope Lines",
    model: Quote,
    skipModelValidation: true,
    headers: [...BASE_HEADERS, "quote_external_ref", "quote_source_system", "scope", "price"],
    sample: {
      source_system: "manual_csv",
      external_ref: "QSL-1",
      quote_external_ref: "QT-3001",
      quote_source_system: "manual_csv",
      scope: "Rewind labor",
      price: "1200",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.quote_external_ref)) errs.push("quote_external_ref is required");
      if (!s(r.scope)) errs.push("scope is required");
      if (s(r.price) && Number.isNaN(Number(s(r.price)))) errs.push("price must be numeric");
      return errs;
    },
    buildPayload: (r, ctx) => {
      const quoteId = ctx.resolveRef("quotes", s(r.quote_source_system || "manual_csv"), s(r.quote_external_ref));
      if (!quoteId) throw new Error("quote_external_ref not found");
      return {
        quoteId,
        scopeLine: {
          scope: s(r.scope),
          price: s(r.price),
        },
      };
    },
    importRow: async ({ payload, ownerEmail }) => {
      const quote = await Quote.findOne({ _id: payload.quoteId, createdByEmail: ownerEmail }).lean();
      if (!quote) throw new Error("Quote not found for scope line");
      const existing = Array.isArray(quote.scopeLines) ? quote.scopeLines : [];
      const already = existing.some((x) => s(x?.scope) === s(payload.scopeLine.scope) && s(x?.price) === s(payload.scopeLine.price));
      const nextScope = already ? existing : [...existing, payload.scopeLine];
      const laborTotal = nextScope.reduce((sum, x) => sum + n(x?.price, 0), 0).toFixed(2);
      await Quote.updateOne(
        { _id: payload.quoteId, createdByEmail: ownerEmail },
        { $set: { scopeLines: nextScope, laborTotal } },
      );
      return { imported: true };
    },
  },
  quotePartLines: {
    label: "Quote Parts Lines",
    model: Quote,
    skipModelValidation: true,
    headers: [...BASE_HEADERS, "quote_external_ref", "quote_source_system", "item", "qty", "uom", "price"],
    sample: {
      source_system: "manual_csv",
      external_ref: "QPL-1",
      quote_external_ref: "QT-3001",
      quote_source_system: "manual_csv",
      item: "Copper wire",
      qty: "12",
      uom: "kg",
      price: "18",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.quote_external_ref)) errs.push("quote_external_ref is required");
      if (!s(r.item)) errs.push("item is required");
      if (s(r.qty) && Number.isNaN(Number(s(r.qty)))) errs.push("qty must be numeric");
      if (s(r.price) && Number.isNaN(Number(s(r.price)))) errs.push("price must be numeric");
      return errs;
    },
    buildPayload: (r, ctx) => {
      const quoteId = ctx.resolveRef("quotes", s(r.quote_source_system || "manual_csv"), s(r.quote_external_ref));
      if (!quoteId) throw new Error("quote_external_ref not found");
      return {
        quoteId,
        partLine: {
          item: s(r.item),
          qty: s(r.qty || "1"),
          uom: s(r.uom),
          price: s(r.price),
        },
      };
    },
    importRow: async ({ payload, ownerEmail }) => {
      const quote = await Quote.findOne({ _id: payload.quoteId, createdByEmail: ownerEmail }).lean();
      if (!quote) throw new Error("Quote not found for parts line");
      const existing = Array.isArray(quote.partsLines) ? quote.partsLines : [];
      const already = existing.some(
        (x) =>
          s(x?.item) === s(payload.partLine.item) &&
          s(x?.qty) === s(payload.partLine.qty) &&
          s(x?.uom) === s(payload.partLine.uom) &&
          s(x?.price) === s(payload.partLine.price),
      );
      const nextParts = already ? existing : [...existing, payload.partLine];
      const partsTotal = nextParts.reduce((sum, x) => sum + n(x?.qty, 0) * n(x?.price, 0), 0).toFixed(2);
      await Quote.updateOne(
        { _id: payload.quoteId, createdByEmail: ownerEmail },
        { $set: { partsLines: nextParts, partsTotal } },
      );
      return { imported: true };
    },
  },
  workOrders: {
    label: "Work Orders",
    model: WorkOrder,
    headers: [
      ...BASE_HEADERS,
      "quote_external_ref",
      "quote_source_system",
      "motor_external_ref",
      "motor_source_system",
      "customer_external_ref",
      "customer_source_system",
      "work_order_number",
      "date",
      "status",
      "status_options_hint",
      "job_type",
      "job_type_options_hint",
      "motor_class",
      "motor_class_options_hint",
      "technician_external_ref",
      "technician_source_system",
      "repair_job_external_ref",
      "repair_job_source_system",
      "repair_job_number",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "WO-5001",
      quote_external_ref: "QT-3001",
      quote_source_system: "manual_csv",
      motor_external_ref: "MTR-0001",
      motor_source_system: "manual_csv",
      customer_external_ref: "CUST-1001",
      customer_source_system: "manual_csv",
      work_order_number: "W-A00001-1",
      date: "2026-04-28",
      status: "Assigned",
      status_options_hint: "Assigned|In Progress|Waiting Parts|QC|Completed|Shipped",
      job_type: "complete_motor",
      job_type_options_hint: "complete_motor|field_frame_only|armature_only (DC only)",
      motor_class: "AC",
      motor_class_options_hint: "AC|DC",
      technician_external_ref: "EMP-1001",
      technician_source_system: "manual_csv",
      repair_job_external_ref: "RFJ-1001",
      repair_job_source_system: "manual_csv",
      repair_job_number: "RF-00042",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.quote_external_ref)) errs.push("quote_external_ref is required");
      if (!s(r.motor_external_ref)) errs.push("motor_external_ref is required");
      if (!s(r.customer_external_ref)) errs.push("customer_external_ref is required");
      if (!s(r.work_order_number)) errs.push("work_order_number is required");
      return errs;
    },
    buildPayload: (r, ctx) => {
      const quoteId = ctx.resolveRef("quotes", s(r.quote_source_system || "manual_csv"), s(r.quote_external_ref));
      if (!quoteId) throw new Error("quote_external_ref not found");
      const motorId = ctx.resolveRef("motors", s(r.motor_source_system || "manual_csv"), s(r.motor_external_ref));
      if (!motorId) throw new Error("motor_external_ref not found");
      const customerId = ctx.resolveRef("customers", s(r.customer_source_system || "manual_csv"), s(r.customer_external_ref));
      if (!customerId) throw new Error("customer_external_ref not found");
      const technicianEmployeeId = s(r.technician_external_ref)
        ? ctx.resolveRef("employees", s(r.technician_source_system || "manual_csv"), s(r.technician_external_ref))
        : "";
      if (s(r.technician_external_ref) && !technicianEmployeeId) {
        throw new Error("technician_external_ref not found");
      }
      const repairFlowJobId = s(r.repair_job_external_ref)
        ? ctx.resolveRef("repairFlowJobs", s(r.repair_job_source_system || "manual_csv"), s(r.repair_job_external_ref))
        : "";
      if (s(r.repair_job_external_ref) && !repairFlowJobId) {
        throw new Error("repair_job_external_ref not found");
      }
      return {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        quoteId,
        quoteExternalRef: s(r.quote_external_ref),
        quoteSourceSystem: s(r.quote_source_system || "manual_csv"),
        motorId,
        motorExternalRef: s(r.motor_external_ref),
        motorSourceSystem: s(r.motor_source_system || "manual_csv"),
        customerId,
        customerExternalRef: s(r.customer_external_ref),
        customerSourceSystem: s(r.customer_source_system || "manual_csv"),
        workOrderNumber: s(r.work_order_number),
        date: s(r.date),
        status: s(r.status || "Assigned"),
        jobType: s(r.job_type || "complete_motor"),
        motorClass: s(r.motor_class || "AC"),
        technicianEmployeeId,
        repairFlowJobId,
        repairJobNumber: s(r.repair_job_number),
        importBatchId: ctx.batchId,
        importedAt: new Date(),
        importStatus: "imported",
      };
    },
  },
  invoices: {
    label: "Invoices",
    model: Invoice,
    headers: [
      ...BASE_HEADERS,
      "quote_external_ref",
      "quote_source_system",
      "customer_external_ref",
      "customer_source_system",
      "motor_external_ref",
      "motor_source_system",
      "invoice_number",
      "rfq_number",
      "date",
      "status",
      "status_options_hint",
      "customer_po",
      "prepared_by",
      "estimated_completion",
      "customer_notes",
      "notes",
      "labor_total",
      "parts_total",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "INV-9101",
      quote_external_ref: "QT-3001",
      quote_source_system: "manual_csv",
      customer_external_ref: "CUST-1001",
      customer_source_system: "manual_csv",
      motor_external_ref: "MTR-0001",
      motor_source_system: "manual_csv",
      invoice_number: "A00001",
      rfq_number: "A00001",
      date: "2026-04-28",
      status: "draft",
      status_options_hint: "draft|sent|partial_paid|fully_paid",
      customer_po: "PO-9001",
      prepared_by: "EMP-1001",
      estimated_completion: "2026-05-03",
      customer_notes: "Payment due in 30 days.",
      notes: "Internal billing note.",
      labor_total: "1200",
      parts_total: "650",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.quote_external_ref)) errs.push("quote_external_ref is required");
      if (!s(r.customer_external_ref)) errs.push("customer_external_ref is required");
      if (!s(r.motor_external_ref)) errs.push("motor_external_ref is required");
      if (!s(r.invoice_number)) errs.push("invoice_number is required");
      return errs;
    },
    buildPayload: (r, ctx) => {
      const quoteId = ctx.resolveRef("quotes", s(r.quote_source_system || "manual_csv"), s(r.quote_external_ref));
      if (!quoteId) throw new Error("quote_external_ref not found");
      const customerId = ctx.resolveRef("customers", s(r.customer_source_system || "manual_csv"), s(r.customer_external_ref));
      if (!customerId) throw new Error("customer_external_ref not found");
      const motorId = ctx.resolveRef("motors", s(r.motor_source_system || "manual_csv"), s(r.motor_external_ref));
      if (!motorId) throw new Error("motor_external_ref not found");
      return {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        quoteId,
        quoteExternalRef: s(r.quote_external_ref),
        quoteSourceSystem: s(r.quote_source_system || "manual_csv"),
        customerId,
        customerExternalRef: s(r.customer_external_ref),
        customerSourceSystem: s(r.customer_source_system || "manual_csv"),
        motorId,
        motorExternalRef: s(r.motor_external_ref),
        motorSourceSystem: s(r.motor_source_system || "manual_csv"),
        invoiceNumber: s(r.invoice_number),
        rfqNumber: s(r.rfq_number),
        date: s(r.date),
        status: s(r.status || "draft"),
        customerPo: s(r.customer_po),
        preparedBy: s(r.prepared_by),
        estimatedCompletion: s(r.estimated_completion),
        customerNotes: s(r.customer_notes),
        notes: s(r.notes),
        laborTotal: s(r.labor_total),
        partsTotal: s(r.parts_total),
        importBatchId: ctx.batchId,
        importedAt: new Date(),
        importStatus: "imported",
      };
    },
  },
  vendors: {
    label: "Vendors",
    model: Vendor,
    headers: [
      ...BASE_HEADERS,
      "name",
      "contact_name",
      "phone",
      "email",
      "address",
      "city",
      "state",
      "zip_code",
      "parts_supplied_csv",
      "payment_terms",
      "notes",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "VEND-55",
      name: "Delta Bearing Supply",
      contact_name: "Mia Ray",
      phone: "+1 281 555 7722",
      email: "orders@deltabearing.com",
      address: "901 Supply Rd",
      city: "Houston",
      state: "Texas",
      zip_code: "77002",
      parts_supplied_csv: "Bearing|Copper wire|Insulation paper",
      payment_terms: "Net 30",
      notes: "",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.name)) errs.push("name is required");
      return errs;
    },
    buildPayload: (r, ctx) => ({
      createdByEmail: ctx.ownerEmail,
      sourceSystem: s(r.source_system || "manual_csv"),
      externalRef: s(r.external_ref),
      name: s(r.name),
      contactName: s(r.contact_name),
      phone: s(r.phone),
      email: s(r.email).toLowerCase(),
      address: s(r.address),
      city: s(r.city),
      state: s(r.state),
      zipCode: s(r.zip_code),
      partsSupplied: s(r.parts_supplied_csv)
        ? s(r.parts_supplied_csv).split("|").map((x) => s(x)).filter(Boolean)
        : [],
      paymentTerms: s(r.payment_terms),
      notes: s(r.notes),
      importBatchId: ctx.batchId,
      importedAt: new Date(),
      importStatus: "imported",
    }),
  },
  inventoryItems: {
    label: "Inventory Items",
    model: InventoryItem,
    headers: [...BASE_HEADERS, "name", "sku", "uom", "on_hand", "reserved", "threshold", "location", "notes"],
    sample: {
      source_system: "manual_csv",
      external_ref: "INVITEM-501",
      name: "6205 Bearing",
      sku: "BRG-6205",
      uom: "ea",
      on_hand: "40",
      reserved: "5",
      threshold: "8",
      location: "Rack A2",
      notes: "",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.name)) errs.push("name is required");
      if (s(r.on_hand) && Number.isNaN(Number(s(r.on_hand)))) errs.push("on_hand must be numeric");
      if (s(r.reserved) && Number.isNaN(Number(s(r.reserved)))) errs.push("reserved must be numeric");
      if (s(r.threshold) && Number.isNaN(Number(s(r.threshold)))) errs.push("threshold must be numeric");
      return errs;
    },
    buildPayload: (r, ctx) => ({
      createdByEmail: ctx.ownerEmail,
      sourceSystem: s(r.source_system || "manual_csv"),
      externalRef: s(r.external_ref),
      name: s(r.name),
      sku: s(r.sku),
      uom: s(r.uom || "ea"),
      onHand: n(r.on_hand, 0),
      reserved: n(r.reserved, 0),
      threshold: n(r.threshold, 0),
      location: s(r.location),
      notes: s(r.notes),
      importBatchId: ctx.batchId,
      importedAt: new Date(),
      importStatus: "imported",
    }),
  },
  purchaseOrders: {
    label: "Purchase Orders",
    model: PurchaseOrder,
    headers: [
      ...BASE_HEADERS,
      "po_number",
      "vendor_external_ref",
      "vendor_source_system",
      "type",
      "type_options_hint",
      "quote_external_ref",
      "quote_source_system",
      "line_items_json",
      "notes",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "PO-2026-01",
      po_number: "P00012",
      vendor_external_ref: "VEND-55",
      vendor_source_system: "manual_csv",
      type: "shop",
      type_options_hint: "shop|job",
      quote_external_ref: "",
      quote_source_system: "manual_csv",
      line_items_json: '[{"description":"6205 Bearing","qty":"2","uom":"ea","unitPrice":"45","status":"Ordered"}]',
      notes: "",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.vendor_external_ref)) errs.push("vendor_external_ref is required");
      if (!s(r.type)) errs.push("type is required");
      if (s(r.type).toLowerCase() === "job" && !s(r.quote_external_ref)) errs.push("quote_external_ref is required when type is job");
      if (s(r.line_items_json)) {
        try {
          parseJsonArrayField(r.line_items_json, "line_items_json");
        } catch (err) {
          errs.push(err.message || "line_items_json must be valid JSON array");
        }
      }
      return errs;
    },
    buildPayload: (r, ctx) => {
      const vendorId = ctx.resolveRef("vendors", s(r.vendor_source_system || "manual_csv"), s(r.vendor_external_ref));
      if (!vendorId) throw new Error("vendor_external_ref not found");
      const quoteId = s(r.quote_external_ref)
        ? ctx.resolveRef("quotes", s(r.quote_source_system || "manual_csv"), s(r.quote_external_ref))
        : "";
      if (s(r.quote_external_ref) && !quoteId) throw new Error("quote_external_ref not found");
      const lineItemsRaw = s(r.line_items_json)
        ? parseJsonArrayField(r.line_items_json, "line_items_json")
        : [];
      const lineItems = lineItemsRaw.map((it) => ({
        description: s(it?.description),
        qty: s(it?.qty || "1"),
        uom: s(it?.uom),
        unitPrice: s(it?.unitPrice),
        status: s(it?.status || "Ordered"),
      }));
      return {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        poNumber: s(r.po_number),
        vendorId,
        vendorExternalRef: s(r.vendor_external_ref),
        vendorSourceSystem: s(r.vendor_source_system || "manual_csv"),
        type: s(r.type || "shop"),
        quoteId,
        lineItems,
        notes: s(r.notes),
        importBatchId: ctx.batchId,
        importedAt: new Date(),
        importStatus: "imported",
      };
    },
  },
  employees: {
    label: "Employees",
    model: Employee,
    headers: [
      ...BASE_HEADERS,
      "name",
      "email",
      "role",
      "role_options_hint",
      "phone",
      "can_login",
      "technician_app_access",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "EMP-1001",
      name: "Mike Turner",
      email: "mike@shop.com",
      role: "Technician",
      role_options_hint: "Technician|Lead|Office|Supervisor|Manager|Other",
      phone: "+1 713 555 0140",
      can_login: "false",
      technician_app_access: "true",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.name)) errs.push("name is required");
      return errs;
    },
    buildPayload: (r, ctx) => {
      const canLoginRaw = s(r.can_login).toLowerCase();
      const appAccessRaw = s(r.technician_app_access).toLowerCase();
      return {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        name: s(r.name),
        email: s(r.email).toLowerCase(),
        role: s(r.role),
        phone: s(r.phone),
        canLogin: canLoginRaw === "true" || canLoginRaw === "yes" || canLoginRaw === "1",
        technicianAppAccess: appAccessRaw === "true" || appAccessRaw === "yes" || appAccessRaw === "1",
        importBatchId: ctx.batchId,
        importedAt: new Date(),
        importStatus: "imported",
      };
    },
  },
  salesPersons: {
    label: "Sales Persons",
    model: SalesPerson,
    headers: [...BASE_HEADERS, "name", "phone", "email", "bank_detail"],
    sample: {
      source_system: "manual_csv",
      external_ref: "SP-1001",
      name: "Sarah Lee",
      phone: "+1 713 555 0199",
      email: "sarah@shop.com",
      bank_detail: "ACH only",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.name)) errs.push("name is required");
      return errs;
    },
    buildPayload: (r, ctx) => ({
      createdByEmail: ctx.ownerEmail,
      sourceSystem: s(r.source_system || "manual_csv"),
      externalRef: s(r.external_ref),
      name: s(r.name),
      phone: s(r.phone),
      email: s(r.email).toLowerCase(),
      bankDetail: s(r.bank_detail),
      importBatchId: ctx.batchId,
      importedAt: new Date(),
      importStatus: "imported",
    }),
  },
  salesCommissions: {
    label: "Sales Commission",
    model: SalesCommission,
    headers: [
      ...BASE_HEADERS,
      "salesperson_external_ref",
      "salesperson_source_system",
      "job_external_ref",
      "job_source_system",
      "amount",
      "status",
      "status_options_hint",
      "paid_at",
      "quote_id",
      "rfq_number",
      "job_number",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "SC-1001",
      salesperson_external_ref: "SP-1001",
      salesperson_source_system: "manual_csv",
      job_external_ref: "RFJ-1001",
      job_source_system: "manual_csv",
      amount: "125.50",
      status: "unpaid",
      status_options_hint: "unpaid|paid",
      paid_at: "",
      quote_id: "",
      rfq_number: "",
      job_number: "RF-00042",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.salesperson_external_ref)) errs.push("salesperson_external_ref is required");
      if (!s(r.amount)) errs.push("amount is required");
      if (Number.isNaN(Number(s(r.amount)))) errs.push("amount must be numeric");
      const status = s(r.status || "unpaid").toLowerCase();
      if (!["unpaid", "paid"].includes(status)) errs.push("status must be unpaid or paid");
      if (s(r.job_external_ref) && !s(r.job_source_system)) errs.push("job_source_system is required when job_external_ref is provided");
      return errs;
    },
    buildPayload: (r, ctx) => {
      const salesPersonId = ctx.resolveRef(
        "salesPersons",
        s(r.salesperson_source_system || "manual_csv"),
        s(r.salesperson_external_ref),
      );
      if (!salesPersonId) throw new Error("salesperson_external_ref not found");
      const jobExternalRef = s(r.job_external_ref);
      const jobSourceSystem = s(r.job_source_system || "manual_csv");
      const repairFlowJobId = jobExternalRef ? ctx.resolveRef("repairFlowJobs", jobSourceSystem, jobExternalRef) : "";
      if (jobExternalRef && !repairFlowJobId) throw new Error("job_external_ref not found");
      const paidAtTxt = s(r.paid_at);
      const paidAt = paidAtTxt ? new Date(paidAtTxt) : null;
      if (paidAtTxt && Number.isNaN(paidAt?.getTime?.())) throw new Error("paid_at must be a valid date");
      return {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        salesPersonId,
        salesPersonSourceSystem: s(r.salesperson_source_system || "manual_csv"),
        salesPersonExternalRef: s(r.salesperson_external_ref),
        repairFlowJobId,
        jobSourceSystem: jobSourceSystem,
        jobExternalRef: jobExternalRef,
        amount: n(r.amount, 0),
        status: s(r.status || "unpaid").toLowerCase(),
        paidAt,
        quoteId: s(r.quote_id),
        rfqNumber: s(r.rfq_number),
        jobNumber: s(r.job_number),
        importBatchId: ctx.batchId,
        importedAt: new Date(),
        importStatus: "imported",
      };
    },
  },
  repairFlowJobs: {
    label: "Repair Flow Jobs",
    model: MotorRepairJob,
    headers: [
      ...BASE_HEADERS,
      "job_number",
      "customer_external_ref",
      "customer_source_system",
      "motor_external_ref",
      "motor_source_system",
      "phase",
      "phase_options_hint",
      "complaint",
      "nameplate_summary",
      "intake_notes",
      "qa_passed",
      "qa_notes",
      "final_test_summary",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "RFJ-1001",
      job_number: "RF-00042",
      customer_external_ref: "CUST-1001",
      customer_source_system: "manual_csv",
      motor_external_ref: "MTR-0001",
      motor_source_system: "manual_csv",
      phase: "intake",
      phase_options_hint: "intake|pre_inspection|preliminary_quote|awaiting_preliminary_approval|teardown_approved|disassembly_detailed|final_quote|awaiting_final_approval|work_execution|testing_qa|completed|closed_returned|closed_scrap",
      complaint: "Trips breaker at startup",
      nameplate_summary: "50 HP, 460V, 1780 RPM",
      intake_notes: "",
      qa_passed: "",
      qa_notes: "",
      final_test_summary: "",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.job_number)) errs.push("job_number is required");
      if (!s(r.customer_external_ref)) errs.push("customer_external_ref is required");
      if (!s(r.motor_external_ref)) errs.push("motor_external_ref is required");
      return errs;
    },
    buildPayload: (r, ctx) => {
      const customerId = ctx.resolveRef("customers", s(r.customer_source_system || "manual_csv"), s(r.customer_external_ref));
      if (!customerId) throw new Error("customer_external_ref not found");
      const motorId = ctx.resolveRef("motors", s(r.motor_source_system || "manual_csv"), s(r.motor_external_ref));
      if (!motorId) throw new Error("motor_external_ref not found");
      const qaRaw = s(r.qa_passed).toLowerCase();
      const qaPassed = qaRaw === "" ? null : qaRaw === "true" || qaRaw === "yes" || qaRaw === "1";
      return {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        jobNumber: s(r.job_number),
        customerId,
        customerSourceSystem: s(r.customer_source_system || "manual_csv"),
        customerExternalRef: s(r.customer_external_ref),
        motorId,
        motorSourceSystem: s(r.motor_source_system || "manual_csv"),
        motorExternalRef: s(r.motor_external_ref),
        phase: s(r.phase || "intake"),
        complaint: s(r.complaint),
        nameplateSummary: s(r.nameplate_summary),
        intakeNotes: s(r.intake_notes),
        qaPassed,
        qaNotes: s(r.qa_notes),
        finalTestSummary: s(r.final_test_summary),
        importBatchId: ctx.batchId,
        importedAt: new Date(),
        importStatus: "imported",
      };
    },
  },
  repairFlowQuotes: {
    label: "Repair Flow Quotes",
    model: MotorRepairFlowQuote,
    headers: [
      ...BASE_HEADERS,
      "job_external_ref",
      "job_source_system",
      "stage",
      "stage_options_hint",
      "status",
      "status_options_hint",
      "subtotal",
      "line_items_json",
      "quote_notes",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "RFQ-2001",
      job_external_ref: "RFJ-1001",
      job_source_system: "manual_csv",
      stage: "preliminary",
      stage_options_hint: "preliminary|final",
      status: "draft",
      status_options_hint: "draft|waiting_approval|approved|rejected|locked",
      subtotal: "1850",
      line_items_json: '[{"description":"Rewind labor","quantity":1,"unitPrice":1200,"notes":"","subjectToTeardown":false}]',
      quote_notes: "",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.job_external_ref)) errs.push("job_external_ref is required");
      if (!s(r.stage)) errs.push("stage is required");
      if (s(r.line_items_json)) {
        try {
          parseJsonArrayField(r.line_items_json, "line_items_json");
        } catch (err) {
          errs.push(err.message || "line_items_json must be valid JSON array");
        }
      }
      return errs;
    },
    buildPayload: (r, ctx) => {
      const jobId = ctx.resolveRef("repairFlowJobs", s(r.job_source_system || "manual_csv"), s(r.job_external_ref));
      if (!jobId) throw new Error("job_external_ref not found");
      const lineItemsRaw = s(r.line_items_json)
        ? parseJsonArrayField(r.line_items_json, "line_items_json")
        : [];
      const lineItems = lineItemsRaw.map((it) => ({
        description: s(it?.description),
        quantity: n(it?.quantity, 1),
        unitPrice: n(it?.unitPrice, 0),
        notes: s(it?.notes),
        subjectToTeardown: Boolean(it?.subjectToTeardown),
      }));
      return {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        jobId,
        jobSourceSystem: s(r.job_source_system || "manual_csv"),
        jobExternalRef: s(r.job_external_ref),
        stage: s(r.stage),
        status: s(r.status || "draft"),
        subtotal: n(r.subtotal, 0),
        lineItems,
        quoteNotes: s(r.quote_notes),
        importBatchId: ctx.batchId,
        importedAt: new Date(),
        importStatus: "imported",
      };
    },
  },
  repairFlowInspections: {
    label: "Repair Flow Inspections",
    model: MotorRepairInspection,
    headers: [
      ...BASE_HEADERS,
      "job_external_ref",
      "job_source_system",
      "kind",
      "kind_options_hint",
      "component",
      "component_options_hint",
      "findings_json",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "RFI-3001",
      job_external_ref: "RFJ-1001",
      job_source_system: "manual_csv",
      kind: "preliminary",
      kind_options_hint: "preliminary|detailed",
      component: "stator",
      component_options_hint: "stator|rotor|field_frame|armature|full_motor",
      findings_json: "{\"summary\":\"Insulation appears degraded\"}",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.job_external_ref)) errs.push("job_external_ref is required");
      if (!s(r.kind)) errs.push("kind is required");
      if (!s(r.component)) errs.push("component is required");
      if (s(r.findings_json)) {
        try {
          JSON.parse(String(r.findings_json));
        } catch {
          errs.push("findings_json must be valid JSON");
        }
      }
      return errs;
    },
    buildPayload: (r, ctx) => {
      const jobId = ctx.resolveRef("repairFlowJobs", s(r.job_source_system || "manual_csv"), s(r.job_external_ref));
      if (!jobId) throw new Error("job_external_ref not found");
      return {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        jobId,
        jobSourceSystem: s(r.job_source_system || "manual_csv"),
        jobExternalRef: s(r.job_external_ref),
        kind: s(r.kind),
        component: s(r.component),
        findings: s(r.findings_json) ? JSON.parse(String(r.findings_json)) : {},
        importBatchId: ctx.batchId,
        importedAt: new Date(),
        importStatus: "imported",
      };
    },
  },
};

export function listImportCollections() {
  return Object.entries(IMPORT_COLLECTIONS).map(([value, cfg]) => ({ value, label: cfg.label }));
}

export function templateCsvForCollection(collection) {
  const cfg = IMPORT_COLLECTIONS[collection];
  if (!cfg) return null;
  const rows = [cfg.headers, cfg.headers.map((h) => cfg.sample?.[h] ?? "")];
  return toCsv(rows);
}

function rowsToObjects(csvText) {
  const parsed = parseCsv(csvText);
  if (!parsed.length) return { headers: [], rows: [] };
  const headers = parsed[0].map((h) => s(h));
  const rows = parsed.slice(1).filter((r) => r.some((x) => s(x) !== ""));
  const objects = rows.map((r) =>
    headers.reduce((acc, h, i) => {
      acc[h] = r[i] ?? "";
      return acc;
    }, {}),
  );
  return { headers, rows: objects };
}

async function fetchRefMaps(ownerEmail) {
  const [customers, motors, quotes, vendors, repairFlowJobs, salesPersons, employees] = await Promise.all([
    Customer.find({ createdByEmail: ownerEmail, externalRef: { $gt: "" } }).select("_id sourceSystem externalRef").lean(),
    Motor.find({ createdByEmail: ownerEmail, externalRef: { $gt: "" } }).select("_id sourceSystem externalRef").lean(),
    Quote.find({ createdByEmail: ownerEmail, externalRef: { $gt: "" } }).select("_id sourceSystem externalRef").lean(),
    Vendor.find({ createdByEmail: ownerEmail, externalRef: { $gt: "" } }).select("_id sourceSystem externalRef").lean(),
    MotorRepairJob.find({ createdByEmail: ownerEmail, externalRef: { $gt: "" } }).select("_id sourceSystem externalRef").lean(),
    SalesPerson.find({ createdByEmail: ownerEmail, externalRef: { $gt: "" } }).select("_id sourceSystem externalRef").lean(),
    Employee.find({ createdByEmail: ownerEmail, externalRef: { $gt: "" } }).select("_id sourceSystem externalRef").lean(),
  ]);

  const toMap = (items) => {
    const m = new Map();
    for (const it of items) {
      const k = key(it.sourceSystem || "manual_csv", it.externalRef);
      m.set(k, String(it._id));
    }
    return m;
  };
  return {
    customers: toMap(customers),
    motors: toMap(motors),
    quotes: toMap(quotes),
    vendors: toMap(vendors),
    repairFlowJobs: toMap(repairFlowJobs),
    salesPersons: toMap(salesPersons),
    employees: toMap(employees),
  };
}

export async function importCollectionCsv({ collection, csvText, ownerEmail }) {
  const cfg = IMPORT_COLLECTIONS[collection];
  if (!cfg) throw new Error("Unknown collection");

  const { headers, rows } = rowsToObjects(csvText);
  if (!headers.length) throw new Error("CSV is empty");
  const missingHeaders = cfg.headers.filter((h) => !headers.includes(h));
  if (missingHeaders.length) {
    throw new Error(`Missing required template columns: ${missingHeaders.join(", ")}`);
  }

  const maps = await fetchRefMaps(ownerEmail);
  const resolveRef = (kind, sourceSystem, externalRef) => maps[kind]?.get(key(sourceSystem || "manual_csv", externalRef || "")) || "";
  const batchId = `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const invalid = [];
  const validPayloads = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const errs = cfg.validateRow ? cfg.validateRow(row) : [];
    if (errs.length) {
      invalid.push({ rowNumber: i + 2, row, reason: errs.join("; ") });
      continue;
    }
    try {
      const payload = cfg.buildPayload(row, { ownerEmail, batchId, resolveRef });
      if (!cfg.skipModelValidation) {
        const doc = new cfg.model(payload);
        const validationErr = doc.validateSync();
        if (validationErr) {
          const reason = Object.values(validationErr.errors || {})
            .map((e) => e?.message)
            .filter(Boolean)
            .join("; ");
          invalid.push({ rowNumber: i + 2, row, reason: reason || "Validation failed" });
          continue;
        }
      }
      validPayloads.push({ row, payload, rowNumber: i + 2 });
    } catch (err) {
      invalid.push({ rowNumber: i + 2, row, reason: err?.message || "Validation failed" });
    }
  }

  let imported = 0;
  for (const item of validPayloads) {
    const payload = item.payload;
    try {
      if (typeof cfg.importRow === "function") {
        await cfg.importRow({ payload, ownerEmail, row: item.row, rowNumber: item.rowNumber });
      } else {
        await cfg.model.updateOne(
          {
            createdByEmail: ownerEmail,
            sourceSystem: payload.sourceSystem,
            externalRef: payload.externalRef,
          },
          { $set: payload },
          { upsert: true },
        );
      }
      imported += 1;
    } catch (err) {
      invalid.push({
        rowNumber: item.rowNumber,
        row: item.row,
        reason: err?.message || "Failed to import row",
      });
    }
  }

  const invalidCsvRows = [
    ["row_number", ...cfg.headers, "error_reason"],
    ...invalid.map((x) => [String(x.rowNumber), ...cfg.headers.map((h) => x.row[h] ?? ""), x.reason]),
  ];

  return {
    totalRows: rows.length,
    validRows: validPayloads.length,
    importedRows: imported,
    invalidRows: invalid.length,
    invalidCsv: invalid.length ? toCsv(invalidCsvRows) : "",
    batchId,
  };
}

