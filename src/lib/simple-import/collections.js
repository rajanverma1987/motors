import Customer from "@/models/Customer";
import Vendor from "@/models/Vendor";
import InventoryItem from "@/models/InventoryItem";
import Employee from "@/models/Employee";
import SalesPerson from "@/models/SalesPerson";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import UserSettings from "@/models/UserSettings";
import { parseCsv, toCsv } from "@/lib/simple-import/csv";
import { mergeUserSettings } from "@/lib/user-settings";
import { resolveConfiguredStatusSlug } from "@/lib/dropdown-catalog";
import { computeSimpleServiceProposalTotals } from "@/lib/simple-service-proposal-form";

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

function newLineId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function refreshServiceProposalListTotals(doc) {
  if (!doc) return;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const totals = computeSimpleServiceProposalTotals(plain);
  doc.set("proposalTotal", totals.proposalTotal);
  doc.set("taxCollected", totals.taxCollected);
  doc.set("total", totals.total);
  await doc.save();
}

const BASE_HEADERS = ["source_system", "external_ref"];

const IMPORT_COLLECTIONS = {
  customers: {
    label: "Customers",
    model: Customer,
    requiredHeaders: [...BASE_HEADERS, "company_name"],
    headers: [
      ...BASE_HEADERS,
      "customer_number",
      "company_name",
      "primary_contact_name",
      "phone",
      "fax",
      "email",
      "alternate_phone",
      "alternate_email",
      "billing_contact",
      "customer_type",
      "payment_terms",
      "preferred_payment_method",
      "preferred_contact_method",
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
      "additional_contacts",
      "documents_json",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "CUST-1001",
      customer_number: "001",
      company_name: "Acme Pumps",
      primary_contact_name: "John Smith",
      phone: "+1 713 555 0101",
      fax: "+1 713 555 0199",
      email: "john@acmepumps.com",
      alternate_phone: "+1 713 555 0102",
      alternate_email: "billing@acmepumps.com",
      billing_contact: "Jane Roe",
      customer_type: "Industrial",
      payment_terms: "NET 30",
      preferred_payment_method: "ACH",
      preferred_contact_method: "Email",
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
      additional_contacts: '[{"contactName":"Jane Roe","phone":"+1 713 555 0102","email":"jane@acmepumps.com"}]',
      documents_json: '[{"name":"tax exempt","url":"C:\\\\Docs\\\\Acme\\\\tax-exempt.pdf"}]',
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.company_name)) errs.push("company_name is required");
      if (s(r.additional_contacts)) {
        try {
          parseJsonArrayField(r.additional_contacts, "additional_contacts");
        } catch (err) {
          errs.push(err.message || "additional_contacts must be valid JSON array");
        }
      }
      if (s(r.documents_json)) {
        try {
          parseJsonArrayField(r.documents_json, "documents_json");
        } catch (err) {
          errs.push(err.message || "documents_json must be valid JSON array");
        }
      }
      return errs;
    },
    buildPayload: (r, ctx) => {
      const payload = {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        customerNumber: s(r.customer_number),
        companyName: s(r.company_name),
        primaryContactName: s(r.primary_contact_name),
        phone: s(r.phone),
        fax: s(r.fax),
        email: s(r.email).toLowerCase(),
        alternatePhone: s(r.alternate_phone),
        alternateEmail: s(r.alternate_email).toLowerCase(),
        billingContact: s(r.billing_contact),
        customerType: s(r.customer_type),
        paymentTerms: s(r.payment_terms),
        preferredPaymentMethod: s(r.preferred_payment_method),
        preferredContactMethod: s(r.preferred_contact_method),
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
      };
      if (s(r.additional_contacts)) {
        const contacts = parseJsonArrayField(r.additional_contacts, "additional_contacts");
        payload.additionalContacts = contacts.map((c) => ({
          contactName: s(c?.contactName ?? c?.contact_name),
          phone: s(c?.phone),
          email: s(c?.email).toLowerCase(),
        }));
      }
      if (s(r.documents_json)) {
        const docs = parseJsonArrayField(r.documents_json, "documents_json");
        payload.documents = docs
          .map((d) => ({
            name: s(d?.name ?? d?.documentName ?? d?.document_name),
            url: s(d?.url ?? d?.path ?? d?.documents),
          }))
          .filter((d) => d.name || d.url);
      }
      return payload;
    },
  },
  vendors: {
    label: "Vendors",
    model: Vendor,
    requiredHeaders: [...BASE_HEADERS, "name"],
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
      "attachments_json",
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
      notes: "Preferred bearing vendor",
      attachments_json: "[]",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.name)) errs.push("name is required");
      if (s(r.attachments_json)) {
        try {
          parseJsonArrayField(r.attachments_json, "attachments_json");
        } catch (err) {
          errs.push(err.message || "attachments_json must be valid JSON array");
        }
      }
      return errs;
    },
    buildPayload: (r, ctx) => {
      const payload = {
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
          ? s(r.parts_supplied_csv)
              .split("|")
              .map((x) => s(x))
              .filter(Boolean)
          : [],
        paymentTerms: s(r.payment_terms),
        notes: s(r.notes),
        importBatchId: ctx.batchId,
        importedAt: new Date(),
        importStatus: "imported",
      };
      if (s(r.attachments_json)) {
        const docs = parseJsonArrayField(r.attachments_json, "attachments_json");
        payload.attachments = docs
          .map((d) => ({
            name: s(d?.name ?? d?.documentName ?? d?.document_name),
            url: s(d?.url ?? d?.path),
          }))
          .filter((d) => d.name || d.url);
      }
      return payload;
    },
  },
  inventoryItems: {
    label: "Inventory Items",
    model: InventoryItem,
    requiredHeaders: [...BASE_HEADERS, "name"],
    headers: [...BASE_HEADERS, "name", "sku", "uom", "on_hand", "reserved", "threshold", "location", "notes"],
    sample: {
      source_system: "manual_csv",
      external_ref: "INVITEM-501",
      name: "6205 Bearing",
      sku: "BRG-6205",
      uom: "ea",
      on_hand: "40",
      reserved: "0",
      threshold: "8",
      location: "Rack A2",
      notes: "Deep groove ball bearing",
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
      uom: s(r.uom || "ea") || "ea",
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
  employees: {
    label: "Employees",
    model: Employee,
    requiredHeaders: [...BASE_HEADERS, "name"],
    headers: [
      ...BASE_HEADERS,
      "name",
      "email",
      "role",
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
    buildPayload: (r, ctx) => ({
      createdByEmail: ctx.ownerEmail,
      sourceSystem: s(r.source_system || "manual_csv"),
      externalRef: s(r.external_ref),
      name: s(r.name),
      email: s(r.email).toLowerCase(),
      role: s(r.role),
      phone: s(r.phone),
      canLogin: boolish(r.can_login, false),
      technicianAppAccess: boolish(r.technician_app_access, false),
      importBatchId: ctx.batchId,
      importedAt: new Date(),
      importStatus: "imported",
    }),
  },
  salesPersons: {
    label: "Sales Persons",
    model: SalesPerson,
    requiredHeaders: [...BASE_HEADERS, "name"],
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
  simpleServiceProposals: {
    label: "Service Proposals",
    model: SimpleServiceProposal,
    /** Older CSVs may omit newer optional columns; these must always be present. */
    requiredHeaders: [...BASE_HEADERS, "customer_external_ref"],
    headers: [
      ...BASE_HEADERS,
      "customer_external_ref",
      "customer_source_system",
      "document_number",
      "record_type",
      "status",
      "job_status",
      "date_created",
      "company_name",
      "customer_phone",
      "customer_email",
      "customer_tax_exempt",
      "tax_percent",
      "customer_po",
      "shipping_po",
      "motor_power",
      "nameplate",
      "manufacturer",
      "hp_kw",
      "frame_type",
      "model_number",
      "volts",
      "amps",
      "rpm",
      "sl",
      "cl",
      "cd",
      "bars",
      "motor_paint",
      "prepared_by",
      "proposal_approved_by",
      "quote_type",
      "due_date",
      "proposal_submit_date",
      "proposal_accepted_date",
      "invoice_submit_date",
      "invoice_paid_date",
      "internal_notes",
      "customer_notes",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "SSP-1001",
      customer_external_ref: "CUST-1001",
      customer_source_system: "manual_csv",
      document_number: "RFQ-0001",
      record_type: "RFQ",
      status: "Proposal Submitted",
      job_status: "",
      date_created: "2026-08-01",
      company_name: "Acme Pumps",
      customer_phone: "+1 713 555 0101",
      customer_email: "john@acmepumps.com",
      customer_tax_exempt: "true",
      tax_percent: "0",
      customer_po: "PO-7788",
      shipping_po: "",
      motor_power: "AC",
      nameplate: "Original",
      manufacturer: "Siemens",
      hp_kw: "50",
      frame_type: "256T",
      model_number: "1LA7",
      volts: "460",
      amps: "62",
      rpm: "1780",
      sl: "",
      cl: "",
      cd: "",
      bars: "",
      motor_paint: "",
      prepared_by: "Mike Turner",
      proposal_approved_by: "",
      quote_type: "Email",
      due_date: "2026-08-15",
      proposal_submit_date: "2026-08-02",
      proposal_accepted_date: "",
      invoice_submit_date: "",
      invoice_paid_date: "",
      internal_notes: "Rush job",
      customer_notes: "Call before ship",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.customer_external_ref)) errs.push("customer_external_ref is required");
      const recordType = s(r.record_type || "RFQ").toUpperCase();
      if (recordType && !["RFQ", "JOB", "INVOICE"].includes(recordType)) {
        errs.push("record_type must be RFQ, JOB, or INVOICE");
      }
      const motorPower = s(r.motor_power || "AC").toUpperCase();
      if (motorPower && !["AC", "DC"].includes(motorPower)) {
        errs.push("motor_power must be AC or DC");
      }
      return errs;
    },
    buildPayload: async (r, ctx) => {
      const customerId = ctx.resolveRef(
        "customers",
        s(r.customer_source_system || "manual_csv"),
        s(r.customer_external_ref),
      );
      if (!customerId) throw new Error("customer_external_ref not found");

      let customer = null;
      try {
        customer = await Customer.findOne({ _id: customerId, createdByEmail: ctx.ownerEmail })
          .select("companyName phone email taxExempt taxPercent")
          .lean();
      } catch {
        customer = null;
      }

      const settingsDoc = await UserSettings.findOne({ ownerEmail: ctx.ownerEmail }).lean();
      const mergedSettings = mergeUserSettings(settingsDoc?.settings);
      const documentNumber = s(r.document_number);
      const dateCreated = s(r.date_created);
      const preparedBy = s(r.prepared_by);
      const internalNotes = s(r.internal_notes);
      const companyName = s(r.company_name) || s(customer?.companyName);
      const customerPhone = s(r.customer_phone) || s(customer?.phone);
      const customerEmail = (s(r.customer_email) || s(customer?.email)).toLowerCase();
      const status = resolveConfiguredStatusSlug(r.status, mergedSettings);
      const motorPower = s(r.motor_power || "AC").toUpperCase() || "AC";
      const hasTaxExemptCol = Object.prototype.hasOwnProperty.call(r, "customer_tax_exempt") && s(r.customer_tax_exempt) !== "";
      const customerTaxExempt = hasTaxExemptCol
        ? boolish(r.customer_tax_exempt, true)
        : customer?.taxExempt !== false;
      const taxPercent = s(r.tax_percent) || s(customer?.taxPercent || "0") || "0";
      const proposalSubmitDate = s(r.proposal_submit_date);
      const proposalAcceptedDate = s(r.proposal_accepted_date);

      // Header-only upsert — do not touch scopeDetails / otherItems / datasheets / attachments
      // (import line items via child CSVs; datasheets stay in-app).
      return {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        customerId,
        documentNumber,
        quote: documentNumber,
        recordType: s(r.record_type || "RFQ").toUpperCase() || "RFQ",
        status,
        jobStatus: s(r.job_status),
        dateCreated,
        date: dateCreated,
        companyName,
        customerPo: s(r.customer_po),
        shippingPo: s(r.shipping_po),
        motorPower,
        namePlate: s(r.nameplate || "Original") || "Original",
        manufacturer: s(r.manufacturer),
        hpKw: s(r.hp_kw),
        frameType: s(r.frame_type),
        modelNumber: s(r.model_number),
        volts: s(r.volts),
        amps: s(r.amps),
        rpm: s(r.rpm),
        sl: s(r.sl),
        cl: s(r.cl),
        cd: s(r.cd),
        bars: s(r.bars),
        motorPaint: s(r.motor_paint),
        preparedBy,
        quotedBy: preparedBy,
        proposalApprovedBy: s(r.proposal_approved_by),
        quoteType: s(r.quote_type),
        dueDate: s(r.due_date),
        proposalSubmitDate,
        proposalAcceptedDate,
        submitDate: proposalSubmitDate,
        acceptDate: proposalAcceptedDate,
        invoiceSubmitDate: s(r.invoice_submit_date),
        invoicePaidDate: s(r.invoice_paid_date),
        internalNotes,
        notes: internalNotes,
        customerNotes: s(r.customer_notes),
        customerPhone,
        customerEmail,
        phone: customerPhone,
        email: customerEmail,
        customerTaxExempt,
        taxPercent,
        importBatchId: ctx.batchId,
        importedAt: new Date(),
        importStatus: "imported",
      };
    },
  },
  /** Child of Service Proposals — one CSV row per scope line (no JSON). */
  simpleServiceProposalScopeDetails: {
    label: "Service Proposal — Scope Details",
    model: SimpleServiceProposal,
    skipModelValidation: true,
    parentCollection: "simpleServiceProposals",
    requiredHeaders: [...BASE_HEADERS, "service_proposal_external_ref", "description"],
    headers: [
      ...BASE_HEADERS,
      "service_proposal_external_ref",
      "service_proposal_source_system",
      "description",
      "price",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "SSP-1001-SCOPE-1",
      service_proposal_external_ref: "SSP-1001",
      service_proposal_source_system: "manual_csv",
      description: "Rewind stator",
      price: "1200",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.service_proposal_external_ref)) {
        errs.push("service_proposal_external_ref is required");
      }
      if (!s(r.description)) errs.push("description is required");
      return errs;
    },
    buildPayload: (r, ctx) => {
      const serviceProposalId = ctx.resolveRef(
        "simpleServiceProposals",
        s(r.service_proposal_source_system || "manual_csv"),
        s(r.service_proposal_external_ref),
      );
      if (!serviceProposalId) {
        throw new Error("service_proposal_external_ref not found — import Service Proposals first");
      }
      const lineRef = s(r.external_ref);
      return {
        serviceProposalId,
        line: {
          id: lineRef,
          externalRef: lineRef,
          sourceSystem: s(r.source_system || "manual_csv"),
          description: s(r.description),
          price: s(r.price),
        },
      };
    },
    importRow: async ({ payload, ownerEmail }) => {
      const doc = await SimpleServiceProposal.findOne({
        _id: payload.serviceProposalId,
        createdByEmail: ownerEmail,
      });
      if (!doc) throw new Error("Service proposal not found");
      const list = Array.isArray(doc.scopeDetails) ? doc.scopeDetails.map((x) => ({ ...(x.toObject?.() || x) })) : [];
      const lineId = s(payload.line.id);
      const idx = list.findIndex((x) => s(x?.id) === lineId || s(x?.externalRef) === lineId);
      if (idx >= 0) list[idx] = { ...list[idx], ...payload.line };
      else list.push(payload.line);
      doc.set("scopeDetails", list);
      doc.markModified("scopeDetails");
      await refreshServiceProposalListTotals(doc);
    },
  },
  /** Child of Service Proposals — one CSV row per other/parts line (no JSON). */
  simpleServiceProposalOtherItems: {
    label: "Service Proposal — Other Items",
    model: SimpleServiceProposal,
    skipModelValidation: true,
    parentCollection: "simpleServiceProposals",
    requiredHeaders: [...BASE_HEADERS, "service_proposal_external_ref", "description"],
    headers: [
      ...BASE_HEADERS,
      "service_proposal_external_ref",
      "service_proposal_source_system",
      "description",
      "uom",
      "price",
      "qty",
      "inventory_item_external_ref",
      "inventory_item_source_system",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "SSP-1001-OTHER-1",
      service_proposal_external_ref: "SSP-1001",
      service_proposal_source_system: "manual_csv",
      description: "6205 Bearing",
      uom: "ea",
      price: "45",
      qty: "1",
      inventory_item_external_ref: "",
      inventory_item_source_system: "manual_csv",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.service_proposal_external_ref)) {
        errs.push("service_proposal_external_ref is required");
      }
      if (!s(r.description)) errs.push("description is required");
      return errs;
    },
    buildPayload: (r, ctx) => {
      const serviceProposalId = ctx.resolveRef(
        "simpleServiceProposals",
        s(r.service_proposal_source_system || "manual_csv"),
        s(r.service_proposal_external_ref),
      );
      if (!serviceProposalId) {
        throw new Error("service_proposal_external_ref not found — import Service Proposals first");
      }
      let inventoryItemId = "";
      if (s(r.inventory_item_external_ref)) {
        inventoryItemId = ctx.resolveRef(
          "inventoryItems",
          s(r.inventory_item_source_system || "manual_csv"),
          s(r.inventory_item_external_ref),
        );
        if (!inventoryItemId) {
          throw new Error("inventory_item_external_ref not found — import Inventory Items first");
        }
      }
      const lineRef = s(r.external_ref);
      return {
        serviceProposalId,
        line: {
          id: lineRef,
          externalRef: lineRef,
          sourceSystem: s(r.source_system || "manual_csv"),
          description: s(r.description),
          uom: s(r.uom),
          price: s(r.price),
          qty: s(r.qty),
          inventoryItemId,
        },
      };
    },
    importRow: async ({ payload, ownerEmail }) => {
      const doc = await SimpleServiceProposal.findOne({
        _id: payload.serviceProposalId,
        createdByEmail: ownerEmail,
      });
      if (!doc) throw new Error("Service proposal not found");
      const list = Array.isArray(doc.otherItems) ? doc.otherItems.map((x) => ({ ...(x.toObject?.() || x) })) : [];
      const lineId = s(payload.line.id);
      const idx = list.findIndex((x) => s(x?.id) === lineId || s(x?.externalRef) === lineId);
      if (idx >= 0) list[idx] = { ...list[idx], ...payload.line };
      else list.push(payload.line);
      doc.set("otherItems", list);
      doc.markModified("otherItems");
      await refreshServiceProposalListTotals(doc);
    },
  },
  simplePurchaseOrders: {
    label: "Purchase Orders",
    model: SimplePurchaseOrder,
    requiredHeaders: [...BASE_HEADERS, "vendor_external_ref", "po_type"],
    headers: [
      ...BASE_HEADERS,
      "po_type",
      "po_number",
      "vendor_external_ref",
      "vendor_source_system",
      "vendor_phone",
      "service_proposal_external_ref",
      "service_proposal_source_system",
      "job_number",
      "po_cut_date",
      "due_date",
      "po_invoice_receive_date",
      "po_item_receive_date",
      "po_paid_date",
      "payment_method",
      "paid_by",
      "payment_status",
      "comments",
      "line_items_json",
      "payments_json",
      "vendor_documents_json",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "SPO-2026-01",
      po_type: "job",
      po_number: "JOB-0001-1",
      vendor_external_ref: "VEND-55",
      vendor_source_system: "manual_csv",
      vendor_phone: "+1 281 555 7722",
      service_proposal_external_ref: "SSP-1001",
      service_proposal_source_system: "manual_csv",
      job_number: "JOB-0001",
      po_cut_date: "2026-08-01",
      due_date: "2026-08-15",
      po_invoice_receive_date: "",
      po_item_receive_date: "",
      po_paid_date: "",
      payment_method: "ACH",
      paid_by: "",
      payment_status: "Unpaid",
      comments: "Need by Friday",
      line_items_json:
        '[{"itemName":"6205 Bearing","uom":"ea","quantity":"2","price":"45","taxPercent":"0","receivedQty":"0","receivingStatus":"Ordered","receivedDate":"","inventory_item_external_ref":"INVITEM-501","inventory_item_source_system":"manual_csv"}]',
      payments_json: '[{"date":"2026-08-10","amount":"90","method":"ACH","paidBy":"AP","notes":""}]',
      vendor_documents_json: "[]",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      const poType = s(r.po_type || "job").toLowerCase();
      if (!["job", "shop"].includes(poType)) errs.push("po_type must be job or shop");
      if (!s(r.vendor_external_ref)) errs.push("vendor_external_ref is required");
      if (poType === "job" && !s(r.service_proposal_external_ref)) {
        errs.push("service_proposal_external_ref is required when po_type is job");
      }
      if (s(r.line_items_json)) {
        try {
          parseJsonArrayField(r.line_items_json, "line_items_json");
        } catch (err) {
          errs.push(err.message || "line_items_json must be valid JSON array");
        }
      }
      if (s(r.payments_json)) {
        try {
          parseJsonArrayField(r.payments_json, "payments_json");
        } catch (err) {
          errs.push(err.message || "payments_json must be valid JSON array");
        }
      }
      if (s(r.vendor_documents_json)) {
        try {
          parseJsonArrayField(r.vendor_documents_json, "vendor_documents_json");
        } catch (err) {
          errs.push(err.message || "vendor_documents_json must be valid JSON array");
        }
      }
      return errs;
    },
    buildPayload: async (r, ctx) => {
      const vendorId = ctx.resolveRef(
        "vendors",
        s(r.vendor_source_system || "manual_csv"),
        s(r.vendor_external_ref),
      );
      if (!vendorId) throw new Error("vendor_external_ref not found");

      let vendorName = "";
      let vendorPhoneFromDb = "";
      try {
        const vendor = await Vendor.findOne({ _id: vendorId, createdByEmail: ctx.ownerEmail })
          .select("name phone")
          .lean();
        vendorName = s(vendor?.name);
        vendorPhoneFromDb = s(vendor?.phone);
      } catch {
        vendorName = "";
      }

      const poType = s(r.po_type || "job").toLowerCase() || "job";
      let serviceProposalId = "";
      if (s(r.service_proposal_external_ref)) {
        serviceProposalId = ctx.resolveRef(
          "simpleServiceProposals",
          s(r.service_proposal_source_system || "manual_csv"),
          s(r.service_proposal_external_ref),
        );
        if (!serviceProposalId) throw new Error("service_proposal_external_ref not found");
      }

      const lineRaw = s(r.line_items_json)
        ? parseJsonArrayField(r.line_items_json, "line_items_json")
        : [];
      const lineItems = lineRaw.map((it) => {
        let inventoryItemId = s(it?.inventoryItemId ?? it?.inventory_item_id);
        const invExt = s(it?.inventory_item_external_ref ?? it?.inventoryItemExternalRef);
        if (!inventoryItemId && invExt) {
          inventoryItemId = ctx.resolveRef(
            "inventoryItems",
            s(it?.inventory_item_source_system ?? it?.inventoryItemSourceSystem ?? "manual_csv"),
            invExt,
          );
          if (!inventoryItemId) {
            throw new Error(
              `inventory_item_external_ref "${invExt}" not found — import Inventory Items first`
            );
          }
        }
        return {
          id: s(it?.id) || newLineId("pol"),
          itemName: s(it?.itemName ?? it?.description),
          uom: s(it?.uom),
          quantity: s(it?.quantity ?? it?.qty ?? "0") || "0",
          price: s(it?.price ?? it?.unitPrice ?? "0.00") || "0.00",
          taxPercent: s(it?.taxPercent ?? it?.tax_percent ?? "0") || "0",
          receivedQty: s(it?.receivedQty ?? it?.received_qty ?? "0") || "0",
          receivingStatus: s(it?.receivingStatus ?? it?.receiving_status ?? "Ordered") || "Ordered",
          receivedDate: s(it?.receivedDate ?? it?.received_date),
          inventoryItemId,
        };
      });

      const payRaw = s(r.payments_json) ? parseJsonArrayField(r.payments_json, "payments_json") : [];
      const payments = payRaw.map((p) => ({
        id: s(p?.id) || newLineId("pop"),
        date: s(p?.date),
        amount: s(p?.amount),
        method: s(p?.method),
        paidBy: s(p?.paidBy ?? p?.paid_by),
        notes: s(p?.notes),
      }));

      let vendorDocuments = [];
      if (s(r.vendor_documents_json)) {
        const docs = parseJsonArrayField(r.vendor_documents_json, "vendor_documents_json");
        vendorDocuments = docs
          .map((d) => ({
            name: s(d?.name ?? d?.documentName ?? d?.document_name),
            url: s(d?.url ?? d?.path),
          }))
          .filter((d) => d.name || d.url);
      }

      return {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        poType,
        poNumber: s(r.po_number),
        vendorId,
        vendorName,
        vendorPhone: s(r.vendor_phone) || vendorPhoneFromDb,
        serviceProposalId,
        jobNumber: s(r.job_number),
        poCutDate: s(r.po_cut_date),
        dueDate: s(r.due_date),
        poInvoiceReceiveDate: s(r.po_invoice_receive_date),
        poItemReceiveDate: s(r.po_item_receive_date),
        poPaidDate: s(r.po_paid_date),
        paymentMethod: s(r.payment_method),
        paidBy: s(r.paid_by),
        paymentStatus: s(r.payment_status || "Unpaid") || "Unpaid",
        comments: s(r.comments),
        lineItems,
        payments,
        vendorDocuments,
        importBatchId: ctx.batchId,
        importedAt: new Date(),
        importStatus: "imported",
      };
    },
  },
};

export function listSimpleImportCollections() {
  return Object.entries(IMPORT_COLLECTIONS).map(([value, cfg]) => ({ value, label: cfg.label }));
}

export function templateCsvForSimpleCollection(collection) {
  const cfg = IMPORT_COLLECTIONS[collection];
  if (!cfg) return null;
  const headers = Array.isArray(cfg.headers) ? cfg.headers : [];
  const sampleRow = headers.map((h) => cfg.sample?.[h] ?? "");
  return toCsv([headers, sampleRow]);
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
  const [customers, vendors, inventoryItems, employees, salesPersons, simpleServiceProposals] =
    await Promise.all([
      Customer.find({ createdByEmail: ownerEmail, externalRef: { $gt: "" } })
        .select("_id sourceSystem externalRef")
        .lean(),
      Vendor.find({ createdByEmail: ownerEmail, externalRef: { $gt: "" } })
        .select("_id sourceSystem externalRef")
        .lean(),
      InventoryItem.find({ createdByEmail: ownerEmail, externalRef: { $gt: "" } })
        .select("_id sourceSystem externalRef")
        .lean(),
      Employee.find({ createdByEmail: ownerEmail, externalRef: { $gt: "" } })
        .select("_id sourceSystem externalRef")
        .lean(),
      SalesPerson.find({ createdByEmail: ownerEmail, externalRef: { $gt: "" } })
        .select("_id sourceSystem externalRef")
        .lean(),
      SimpleServiceProposal.find({ createdByEmail: ownerEmail, externalRef: { $gt: "" } })
        .select("_id sourceSystem externalRef")
        .lean(),
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
    vendors: toMap(vendors),
    inventoryItems: toMap(inventoryItems),
    employees: toMap(employees),
    salesPersons: toMap(salesPersons),
    simpleServiceProposals: toMap(simpleServiceProposals),
  };
}

export async function importSimpleCollectionCsv({ collection, csvText, ownerEmail }) {
  const cfg = IMPORT_COLLECTIONS[collection];
  if (!cfg) throw new Error("Unknown collection");

  const { headers, rows } = rowsToObjects(csvText);
  if (!headers.length) throw new Error("CSV is empty");
  const requiredHeaders = Array.isArray(cfg.requiredHeaders) ? cfg.requiredHeaders : cfg.headers;
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length) {
    throw new Error(`Missing required template columns: ${missingHeaders.join(", ")}`);
  }

  const maps = await fetchRefMaps(ownerEmail);
  const resolveRef = (kind, sourceSystem, externalRef) =>
    maps[kind]?.get(key(sourceSystem || "manual_csv", externalRef || "")) || "";
  const batchId = `simp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const invalid = [];
  const validPayloads = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = { ...rows[i] };
    for (const h of cfg.headers) {
      if (!Object.prototype.hasOwnProperty.call(row, h)) row[h] = "";
    }
    const errs = cfg.validateRow ? cfg.validateRow(row) : [];
    if (errs.length) {
      invalid.push({ rowNumber: i + 2, row, reason: errs.join("; ") });
      continue;
    }
    try {
      const payload = await Promise.resolve(
        cfg.buildPayload(row, { ownerEmail, batchId, resolveRef }),
      );
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
      // Keep in-memory maps current so later rows in the same file can resolve refs.
      if (maps[collection] && payload.externalRef) {
        const saved = await cfg.model
          .findOne({
            createdByEmail: ownerEmail,
            sourceSystem: payload.sourceSystem,
            externalRef: payload.externalRef,
          })
          .select("_id")
          .lean();
        if (saved?._id) {
          maps[collection].set(key(payload.sourceSystem, payload.externalRef), String(saved._id));
        }
      }
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
