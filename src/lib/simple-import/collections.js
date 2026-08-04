import Customer from "@/models/Customer";
import Vendor from "@/models/Vendor";
import InventoryItem from "@/models/InventoryItem";
import Employee from "@/models/Employee";
import SalesPerson from "@/models/SalesPerson";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import { parseCsv, toCsv } from "@/lib/simple-import/csv";

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

const BASE_HEADERS = ["source_system", "external_ref"];

const IMPORT_COLLECTIONS = {
  customers: {
    label: "Customers",
    model: Customer,
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
  simpleServiceProposals: {
    label: "Service Proposals",
    model: SimpleServiceProposal,
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
      "customer_po",
      "nameplate",
      "manufacturer",
      "hp_kw",
      "frame_type",
      "model_number",
      "volts",
      "amps",
      "rpm",
      "prepared_by",
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
      status: "Open",
      job_status: "",
      date_created: "2026-08-01",
      company_name: "Acme Pumps",
      customer_po: "PO-7788",
      nameplate: "Original",
      manufacturer: "Siemens",
      hp_kw: "50",
      frame_type: "256T",
      model_number: "1LA7",
      volts: "460",
      amps: "62",
      rpm: "1780",
      prepared_by: "Mike Turner",
      internal_notes: "Rush job",
      customer_notes: "Call before ship",
    },
    validateRow: (r) => {
      const errs = [];
      if (!s(r.external_ref)) errs.push("external_ref is required");
      if (!s(r.customer_external_ref)) errs.push("customer_external_ref is required");
      const recordType = s(r.record_type || "RFQ").toUpperCase();
      if (!["RFQ", "JOB", "INVOICE"].includes(recordType)) {
        errs.push("record_type must be RFQ, JOB, or INVOICE");
      }
      return errs;
    },
    buildPayload: (r, ctx) => {
      const customerId = ctx.resolveRef(
        "customers",
        s(r.customer_source_system || "manual_csv"),
        s(r.customer_external_ref),
      );
      if (!customerId) throw new Error("customer_external_ref not found");

      // Header-only upsert — do not touch scopeDetails / otherItems (import those via child CSVs).
      return {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        customerId,
        documentNumber: s(r.document_number),
        recordType: s(r.record_type || "RFQ").toUpperCase() || "RFQ",
        status: s(r.status),
        jobStatus: s(r.job_status),
        dateCreated: s(r.date_created),
        companyName: s(r.company_name),
        customerPo: s(r.customer_po),
        namePlate: s(r.nameplate || "Original"),
        manufacturer: s(r.manufacturer),
        hpKw: s(r.hp_kw),
        frameType: s(r.frame_type),
        modelNumber: s(r.model_number),
        volts: s(r.volts),
        amps: s(r.amps),
        rpm: s(r.rpm),
        preparedBy: s(r.prepared_by),
        internalNotes: s(r.internal_notes),
        customerNotes: s(r.customer_notes),
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
      await doc.save();
    },
  },
  /** Child of Service Proposals — one CSV row per other/parts line (no JSON). */
  simpleServiceProposalOtherItems: {
    label: "Service Proposal — Other Items",
    model: SimpleServiceProposal,
    skipModelValidation: true,
    parentCollection: "simpleServiceProposals",
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
      await doc.save();
    },
  },
  simplePurchaseOrders: {
    label: "Purchase Orders",
    model: SimplePurchaseOrder,
    headers: [
      ...BASE_HEADERS,
      "po_type",
      "po_number",
      "vendor_external_ref",
      "vendor_source_system",
      "service_proposal_external_ref",
      "service_proposal_source_system",
      "job_number",
      "po_cut_date",
      "due_date",
      "payment_status",
      "comments",
      "line_items_json",
      "payments_json",
    ],
    sample: {
      source_system: "manual_csv",
      external_ref: "SPO-2026-01",
      po_type: "job",
      po_number: "P00012",
      vendor_external_ref: "VEND-55",
      vendor_source_system: "manual_csv",
      service_proposal_external_ref: "SSP-1001",
      service_proposal_source_system: "manual_csv",
      job_number: "JOB-0001",
      po_cut_date: "2026-08-01",
      due_date: "2026-08-15",
      payment_status: "Unpaid",
      comments: "",
      line_items_json:
        '[{"itemName":"6205 Bearing","uom":"ea","quantity":"2","price":"45","receivingStatus":"Ordered"}]',
      payments_json: "[]",
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
      try {
        const vendor = await Vendor.findOne({ _id: vendorId, createdByEmail: ctx.ownerEmail })
          .select("name")
          .lean();
        vendorName = s(vendor?.name);
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
      const lineItems = lineRaw.map((it) => ({
        id: s(it?.id) || newLineId("pol"),
        itemName: s(it?.itemName ?? it?.description),
        uom: s(it?.uom),
        quantity: s(it?.quantity ?? it?.qty ?? "0"),
        price: s(it?.price ?? it?.unitPrice ?? "0.00"),
        taxPercent: s(it?.taxPercent ?? it?.tax_percent ?? "0"),
        receivedQty: s(it?.receivedQty ?? it?.received_qty ?? "0"),
        receivingStatus: s(it?.receivingStatus ?? it?.receiving_status ?? "Ordered"),
        receivedDate: s(it?.receivedDate ?? it?.received_date),
        inventoryItemId: s(it?.inventoryItemId ?? it?.inventory_item_id),
      }));

      const payRaw = s(r.payments_json) ? parseJsonArrayField(r.payments_json, "payments_json") : [];
      const payments = payRaw.map((p) => ({
        id: s(p?.id) || newLineId("pop"),
        date: s(p?.date),
        amount: s(p?.amount),
        method: s(p?.method),
        paidBy: s(p?.paidBy ?? p?.paid_by),
        notes: s(p?.notes),
      }));

      return {
        createdByEmail: ctx.ownerEmail,
        sourceSystem: s(r.source_system || "manual_csv"),
        externalRef: s(r.external_ref),
        poType,
        poNumber: s(r.po_number),
        vendorId,
        vendorName,
        serviceProposalId,
        jobNumber: s(r.job_number),
        poCutDate: s(r.po_cut_date),
        dueDate: s(r.due_date),
        paymentStatus: s(r.payment_status || "Unpaid"),
        comments: s(r.comments),
        lineItems,
        payments,
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
  const missingHeaders = cfg.headers.filter((h) => !headers.includes(h));
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
    const row = rows[i];
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
