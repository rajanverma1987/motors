import ExcelJS from "exceljs";
import Customer from "@/models/Customer";
import Vendor from "@/models/Vendor";
import InventoryItem from "@/models/InventoryItem";
import Employee from "@/models/Employee";
import SalesPerson from "@/models/SalesPerson";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import {
  AC_DATASHEET_FIELD_COLUMNS,
  DC_ARMATURE_FIELD_COLUMNS,
  DC_FIELD_FRAME_FIELD_COLUMNS,
} from "@/lib/simple-datasheet-form";
import {
  GENERATOR_DATASHEET_FIELD_COLUMNS,
  GENERATOR_ROTOR_COLUMNS,
  PUMP_DATASHEET_FIELD_COLUMNS,
  generatorDatasheetHasData,
  pumpDatasheetHasData,
} from "@/lib/simple-datasheet-extra";

function text(value) {
  return String(value ?? "").trim();
}

function ymd(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = text(value);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function excelDate(value) {
  const day = ymd(value);
  if (!day) return "";
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date, 12, 0, 0));
}

function num(value) {
  if (value == null || value === "") return "";
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : text(value);
}

function yesNo(value) {
  if (value === true || value === "true" || value === "yes" || value === 1 || value === "1") return "Yes";
  if (value === false || value === "false" || value === "no" || value === 0 || value === "0") return "No";
  return "";
}

function prettyStatus(value) {
  const raw = text(value).replace(/^invoice:/i, "");
  if (!raw) return "";
  if (/[_-]/.test(raw) && raw === raw.toLowerCase()) {
    return raw
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return raw;
}

function labelize(key) {
  return text(key)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function linesFrom(obj) {
  if (!obj || typeof obj !== "object") return "";
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value == null || value === "") continue;
    if (typeof value === "object") {
      const inner = linesFrom(value);
      if (inner) lines.push(`${labelize(key)}\n${inner}`);
    } else if (text(value)) {
      lines.push(`${labelize(key)}: ${text(value)}`);
    }
  }
  return lines.join("\n");
}

function peopleText(list) {
  return (Array.isArray(list) ? list : [])
    .map((row) => [row?.contactName, row?.phone, row?.email].map(text).filter(Boolean).join(", "))
    .filter(Boolean)
    .join("\n");
}

function filesText(list) {
  return (Array.isArray(list) ? list : [])
    .map((row) => [row?.name, row?.url].map(text).filter(Boolean).join(": "))
    .filter(Boolean)
    .join("\n");
}

function fieldsOf(columns) {
  const out = [];
  for (const group of columns || []) {
    for (const field of group || []) {
      if (field?.key) out.push({ key: field.key, label: field.label || labelize(field.key) });
    }
  }
  return out;
}

function blockFilled(obj) {
  if (!obj || typeof obj !== "object") return false;
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      if (blockFilled(value)) return true;
    } else if (text(value)) return true;
  }
  return false;
}

function sheetName(name) {
  return String(name || "Sheet").replace(/[\\/*?:\[\]]/g, " ").trim().slice(0, 31) || "Sheet";
}

function tableName(name, index) {
  const base = String(name || "Sheet")
    .replace(/[^A-Za-z0-9]/g, "_")
    .replace(/^([^A-Za-z])/, "T$1")
    .slice(0, 40);
  return `${base || "Sheet"}_${index}`;
}

function columnLetter(col) {
  let n = Math.max(1, Math.floor(Number(col) || 1));
  let out = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    out = String.fromCharCode(65 + m) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function addSheet(workbook, name, columns, records, options = {}) {
  const always = new Set(options.always || []);
  let cols = columns;
  if (options.compact && records.length) {
    cols = columns.filter((col) => {
      if (always.has(col.key)) return true;
      return records.some((row) => {
        const value = row[col.key];
        return value != null && String(value).trim() !== "";
      });
    });
  }
  if (!cols.length) cols = columns.slice(0, 1);

  const sheet = workbook.addWorksheet(sheetName(name));
  sheet.addRow(cols.map((col) => col.label));
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FF1F2937" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF5" } };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 22;

  records.forEach((row) => {
    const values = cols.map((col) => {
      const value = row[col.key];
      if (value == null || value === "") return "";
      if (col.kind === "date") return excelDate(value);
      if (col.kind === "number") return num(value);
      if (col.kind === "yesno") return yesNo(value);
      return value;
    });
    const added = sheet.addRow(values);
    added.alignment = { vertical: "top", wrapText: true };
    cols.forEach((col, index) => {
      const cell = added.getCell(index + 1);
      if (col.kind === "date" && cell.value instanceof Date) cell.numFmt = "yyyy-mm-dd";
      if (col.kind === "number" && typeof cell.value === "number") cell.numFmt = "#,##0.00";
    });
  });

  cols.forEach((col, index) => {
    const headerWidth = String(col.label || "").length + 2;
    const sample = records.slice(0, 40).reduce((max, row) => {
      const value = row[col.key];
      const len = text(value).split("\n")[0].length;
      return Math.max(max, len);
    }, 0);
    const width = Math.min(42, Math.max(12, headerWidth, Math.min(sample + 2, 36)));
    sheet.getColumn(index + 1).width = col.kind === "date" ? 16 : width;
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const lastRow = Math.max(1, records.length + 1);
  if (records.length > 0) {
    try {
      sheet.addTable({
        name: tableName(name, workbook.worksheets.length),
        ref: `A1:${columnLetter(cols.length)}${lastRow}`,
        headerRow: true,
        totalsRow: false,
        style: { theme: "TableStyleMedium2", showRowStripes: true },
      });
    } catch {
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: lastRow, column: cols.length },
      };
    }
  }
  return records.length;
}

function jobLabel(doc) {
  return text(doc?.documentNumber || doc?.quote);
}

function fieldColumns(prefix, columns, sourceKey) {
  return fieldsOf(columns).map((field) => ({
    key: prefix ? `${prefix}_${field.key}` : field.key,
    label: prefix ? `${prefix} ${field.label}` : field.label,
    sourceKey,
    fieldKey: field.key,
  }));
}

function fillFields(row, columns, source) {
  const bag = source && typeof source === "object" ? source : {};
  for (const col of columns) {
    if (!col.fieldKey) continue;
    row[col.key] = text(bag[col.fieldKey]);
  }
}

/**
 * Workbook of the shop's Simple tables. One sheet per collection.
 * @param {string} ownerEmail
 * @returns {Promise<{ buffer: Buffer, filename: string, counts: Record<string, number> }>}
 */
export async function buildShopDataWorkbook(ownerEmail) {
  const owner = text(ownerEmail).toLowerCase();
  const [customers, vendors, inventory, employees, salesPeople, proposals, purchaseOrders] = await Promise.all([
    Customer.find({ createdByEmail: owner }).sort({ companyName: 1 }).lean(),
    Vendor.find({ createdByEmail: owner }).sort({ name: 1 }).lean(),
    InventoryItem.find({ createdByEmail: owner }).sort({ name: 1 }).lean(),
    Employee.find({ createdByEmail: owner })
      .select("name email role phone canLogin technicianAppAccess")
      .sort({ name: 1 })
      .lean(),
    SalesPerson.find({ createdByEmail: owner }).select("name phone email bankDetail").sort({ name: 1 }).lean(),
    SimpleServiceProposal.find({ createdByEmail: owner }).sort({ documentNumber: 1, createdAt: 1 }).lean(),
    SimplePurchaseOrder.find({ createdByEmail: owner }).sort({ poNumber: 1, createdAt: 1 }).lean(),
  ]);

  const inventoryById = new Map(inventory.map((row) => [String(row._id), row]));
  const acFields = fieldColumns("", AC_DATASHEET_FIELD_COLUMNS, "dataSheet");
  const pumpFields = fieldColumns("", PUMP_DATASHEET_FIELD_COLUMNS, "dataSheet");
  const genFields = fieldColumns("", GENERATOR_DATASHEET_FIELD_COLUMNS, "dataSheet");
  const ffFields = fieldColumns("Field frame", DC_FIELD_FRAME_FIELD_COLUMNS, "fieldFrame");
  const armFields = fieldColumns("Armature", DC_ARMATURE_FIELD_COLUMNS, "armature");
  const rotorFields = fieldColumns("Rotor", GENERATOR_ROTOR_COLUMNS, "rotorExciter");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "3PhaseFlow";
  workbook.created = new Date();

  const counts = {};
  const summary = [];

  function put(name, columns, records, options) {
    counts[name] = addSheet(workbook, name, columns, records, options);
    summary.push({ collection: name, rows: counts[name] });
  }

  put(
    "Customers",
    [
      { key: "companyName", label: "Company" },
      { key: "customerNumber", label: "Customer Number" },
      { key: "primaryContactName", label: "Contact" },
      { key: "phone", label: "Phone" },
      { key: "fax", label: "Fax" },
      { key: "email", label: "Email" },
      { key: "alternatePhone", label: "Alternate Phone" },
      { key: "alternateEmail", label: "Alternate Email" },
      { key: "billingContact", label: "Billing Contact" },
      { key: "customerType", label: "Type" },
      { key: "paymentTerms", label: "Payment Terms" },
      { key: "preferredPaymentMethod", label: "Preferred Payment" },
      { key: "preferredContactMethod", label: "Preferred Contact" },
      { key: "address", label: "Address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zipCode", label: "Zip" },
      { key: "country", label: "Country" },
      { key: "shippingAddress", label: "Shipping Address" },
      { key: "shippingCity", label: "Shipping City" },
      { key: "shippingState", label: "Shipping State" },
      { key: "shippingZipCode", label: "Shipping Zip" },
      { key: "shippingCountry", label: "Shipping Country" },
      { key: "ein", label: "EIN" },
      { key: "creditLimit", label: "Credit Limit", kind: "number" },
      { key: "taxExempt", label: "Tax Exempt", kind: "yesno" },
      { key: "taxPercent", label: "Tax Percent", kind: "number" },
      { key: "notes", label: "Notes" },
      { key: "contacts", label: "Additional Contacts" },
      { key: "documents", label: "Documents" },
    ],
    customers.map((row) => ({
      ...row,
      contacts: peopleText(row.additionalContacts),
      documents: filesText(row.documents),
    })),
  );

  put(
    "Vendors",
    [
      { key: "name", label: "Name" },
      { key: "contactName", label: "Contact" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zipCode", label: "Zip" },
      { key: "parts", label: "Parts Supplied" },
      { key: "paymentTerms", label: "Payment Terms" },
      { key: "notes", label: "Notes" },
      { key: "attachments", label: "Attachments" },
    ],
    vendors.map((row) => ({
      ...row,
      parts: (Array.isArray(row.partsSupplied) ? row.partsSupplied : []).map(text).filter(Boolean).join(", "),
      attachments: filesText(row.attachments),
    })),
  );

  put(
    "Inventory Items",
    [
      { key: "name", label: "Name" },
      { key: "sku", label: "SKU" },
      { key: "uom", label: "UOM" },
      { key: "onHand", label: "On Hand", kind: "number" },
      { key: "reserved", label: "Reserved", kind: "number" },
      { key: "available", label: "Available", kind: "number" },
      { key: "threshold", label: "Threshold", kind: "number" },
      { key: "location", label: "Location" },
      { key: "notes", label: "Notes" },
    ],
    inventory.map((row) => ({
      ...row,
      available: num(row.onHand) === "" ? "" : Number(num(row.onHand)) - Number(num(row.reserved) || 0),
    })),
  );

  put(
    "Employees",
    [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "phone", label: "Phone" },
      { key: "canLogin", label: "Can Login", kind: "yesno" },
      { key: "technicianAppAccess", label: "Technician App", kind: "yesno" },
    ],
    employees,
  );

  put(
    "Sales Persons",
    [
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "bankDetail", label: "Bank Detail" },
    ],
    salesPeople,
  );

  put(
    "Service Proposals",
    [
      { key: "jobNumber", label: "Job Number" },
      { key: "recordType", label: "Type" },
      { key: "status", label: "Status" },
      { key: "jobStatus", label: "Job Status" },
      { key: "dateCreated", label: "Date", kind: "date" },
      { key: "companyName", label: "Company" },
      { key: "customerPhone", label: "Phone" },
      { key: "customerEmail", label: "Email" },
      { key: "customerTaxExempt", label: "Tax Exempt", kind: "yesno" },
      { key: "taxPercent", label: "Tax Percent", kind: "number" },
      { key: "customerPo", label: "Customer PO" },
      { key: "shippingPo", label: "Shipping PO" },
      { key: "motorPower", label: "Power" },
      { key: "namePlate", label: "Nameplate" },
      { key: "manufacturer", label: "Manufacturer" },
      { key: "hpKw", label: "HP/kW" },
      { key: "frameType", label: "Frame" },
      { key: "modelNumber", label: "Model" },
      { key: "volts", label: "Volts" },
      { key: "amps", label: "Amps" },
      { key: "rpm", label: "RPM" },
      { key: "sl", label: "SL" },
      { key: "cl", label: "CL" },
      { key: "cd", label: "CD" },
      { key: "bars", label: "Bars" },
      { key: "motorPaint", label: "Motor Paint" },
      { key: "preparedBy", label: "Prepared By" },
      { key: "proposalApprovedBy", label: "Approved By" },
      { key: "quoteType", label: "Quote Type" },
      { key: "dueDate", label: "Due Date", kind: "date" },
      { key: "proposalSubmitDate", label: "Proposal Submitted", kind: "date" },
      { key: "proposalAcceptedDate", label: "Proposal Accepted", kind: "date" },
      { key: "invoiceSubmitDate", label: "Invoice Submitted", kind: "date" },
      { key: "invoicePaidDate", label: "Invoice Paid", kind: "date" },
      { key: "proposalTotal", label: "Scope Total", kind: "number" },
      { key: "taxCollected", label: "Tax", kind: "number" },
      { key: "total", label: "Total", kind: "number" },
      { key: "internalNotes", label: "Internal Notes" },
      { key: "customerNotes", label: "Customer Notes" },
      { key: "attachments", label: "Attachments" },
    ],
    proposals.map((row) => ({
      ...row,
      jobNumber: jobLabel(row),
      status: prettyStatus(row.status),
      jobStatus: prettyStatus(row.jobStatus),
      customerPhone: row.customerPhone || row.phone,
      customerEmail: row.customerEmail || row.email,
      dateCreated: row.dateCreated || row.date,
      attachments: filesText(row.attachments),
    })),
  );

  const scopeRows = [];
  const otherRows = [];
  const invoicePayments = [];
  for (const job of proposals) {
    const jobNumber = jobLabel(job);
    const company = text(job.companyName);
    (Array.isArray(job.scopeDetails) ? job.scopeDetails : []).forEach((line) => {
      if (!text(line?.description) && num(line?.price) === "") return;
      scopeRows.push({ jobNumber, company, description: text(line?.description), price: line?.price });
    });
    (Array.isArray(job.otherItems) ? job.otherItems : []).forEach((line) => {
      if (!text(line?.description) && num(line?.price) === "" && num(line?.qty) === "") return;
      const item = inventoryById.get(String(line?.inventoryItemId || ""));
      const price = num(line?.price);
      const qty = num(line?.qty);
      otherRows.push({
        jobNumber,
        company,
        description: text(line?.description),
        uom: text(line?.uom),
        price,
        qty,
        lineTotal: price === "" || qty === "" ? "" : Number(price) * Number(qty),
        inventoryItem: text(item?.name || item?.sku),
      });
    });
    (Array.isArray(job.payments) ? job.payments : []).forEach((pay) => {
      if (num(pay?.amount) === "" && !ymd(pay?.date)) return;
      invoicePayments.push({
        jobNumber,
        company,
        date: pay?.date,
        amount: pay?.amount,
        method: text(pay?.method),
        notes: text(pay?.notes),
      });
    });
  }

  put(
    "Scope Details",
    [
      { key: "jobNumber", label: "Job Number" },
      { key: "company", label: "Company" },
      { key: "description", label: "Description" },
      { key: "price", label: "Price", kind: "number" },
    ],
    scopeRows,
  );
  put(
    "Other Items",
    [
      { key: "jobNumber", label: "Job Number" },
      { key: "company", label: "Company" },
      { key: "description", label: "Description" },
      { key: "uom", label: "UOM" },
      { key: "qty", label: "Qty", kind: "number" },
      { key: "price", label: "Price", kind: "number" },
      { key: "lineTotal", label: "Line Total", kind: "number" },
      { key: "inventoryItem", label: "Inventory Item" },
    ],
    otherRows,
  );
  put(
    "Invoice Payments",
    [
      { key: "jobNumber", label: "Job Number" },
      { key: "company", label: "Company" },
      { key: "date", label: "Date", kind: "date" },
      { key: "amount", label: "Amount", kind: "number" },
      { key: "method", label: "Method" },
      { key: "notes", label: "Notes" },
    ],
    invoicePayments,
  );

  function datasheetRows(pickSheet, filled, fieldSets) {
    const rows = [];
    for (const job of proposals) {
      const sheet = pickSheet(job);
      if (!filled(sheet)) continue;
      const row = {
        jobNumber: jobLabel(job),
        company: text(job.companyName),
        date: sheet?.date,
        technician: text(sheet?.technician),
        section: text(sheet?.section),
        activeTab: text(sheet?.activeTab),
        disassembly: linesFrom(sheet?.disassembly),
        assembly: linesFrom(sheet?.assembly),
      };
      for (const set of fieldSets) {
        fillFields(row, set.columns, sheet?.[set.sourceKey]);
        if (set.notesKey) row[set.notesKey] = text(sheet?.[set.sourceKey]?.notes);
      }
      rows.push(row);
    }
    return rows;
  }

  const datasheetIdentity = [
    { key: "jobNumber", label: "Job Number" },
    { key: "company", label: "Company" },
    { key: "date", label: "Date", kind: "date" },
    { key: "technician", label: "Technician" },
    { key: "section", label: "Section" },
    { key: "activeTab", label: "Tab" },
  ];
  const alwaysDatasheet = ["jobNumber", "company", "date", "technician"];

  put(
    "AC Datasheet",
    [
      ...datasheetIdentity,
      ...acFields,
      { key: "dsNotes", label: "Notes" },
      { key: "disassembly", label: "Disassembly" },
      { key: "assembly", label: "Assembly" },
    ],
    datasheetRows(
      (job) => job.acDatasheet,
      (sheet) =>
        text(sheet?.technician) ||
        blockFilled(sheet?.dataSheet) ||
        blockFilled(sheet?.disassembly) ||
        blockFilled(sheet?.assembly),
      [{ columns: acFields, sourceKey: "dataSheet", notesKey: "dsNotes" }],
    ),
    { compact: true, always: alwaysDatasheet },
  );

  put(
    "DC Datasheet",
    [
      ...datasheetIdentity,
      ...ffFields,
      { key: "ffNotes", label: "Field Frame Notes" },
      ...armFields,
      { key: "armNotes", label: "Armature Notes" },
    ],
    datasheetRows(
      (job) => job.dcDatasheet,
      (sheet) => text(sheet?.technician) || blockFilled(sheet?.fieldFrame) || blockFilled(sheet?.armature),
      [
        { columns: ffFields, sourceKey: "fieldFrame", notesKey: "ffNotes" },
        { columns: armFields, sourceKey: "armature", notesKey: "armNotes" },
      ],
    ),
    { compact: true, always: alwaysDatasheet },
  );

  put(
    "Pump Datasheet",
    [
      ...datasheetIdentity,
      ...pumpFields,
      { key: "dsNotes", label: "Notes" },
      { key: "disassembly", label: "Disassembly" },
      { key: "assembly", label: "Assembly" },
    ],
    datasheetRows(
      (job) => job.pumpDatasheet,
      (sheet) => pumpDatasheetHasData(sheet),
      [{ columns: pumpFields, sourceKey: "dataSheet", notesKey: "dsNotes" }],
    ),
    { compact: true, always: alwaysDatasheet },
  );

  put(
    "Generator Datasheet",
    [
      ...datasheetIdentity,
      ...genFields,
      { key: "dsNotes", label: "Notes" },
      ...rotorFields,
      { key: "rotorNotes", label: "Rotor Notes" },
      { key: "disassembly", label: "Disassembly" },
      { key: "assembly", label: "Assembly" },
    ],
    datasheetRows(
      (job) => job.generatorDatasheet,
      (sheet) => generatorDatasheetHasData(sheet),
      [
        { columns: genFields, sourceKey: "dataSheet", notesKey: "dsNotes" },
        { columns: rotorFields, sourceKey: "rotorExciter", notesKey: "rotorNotes" },
      ],
    ),
    { compact: true, always: alwaysDatasheet },
  );

  const proposalById = new Map(proposals.map((row) => [String(row._id), row]));
  put(
    "Purchase Orders",
    [
      { key: "poNumber", label: "PO Number" },
      { key: "poType", label: "Type" },
      { key: "vendorName", label: "Vendor" },
      { key: "vendorPhone", label: "Vendor Phone" },
      { key: "jobNumber", label: "Job Number" },
      { key: "company", label: "Company" },
      { key: "poCutDate", label: "PO Date", kind: "date" },
      { key: "dueDate", label: "Due Date", kind: "date" },
      { key: "poInvoiceReceiveDate", label: "Invoice Received", kind: "date" },
      { key: "poItemReceiveDate", label: "Items Received", kind: "date" },
      { key: "poPaidDate", label: "Paid Date", kind: "date" },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "paidBy", label: "Paid By" },
      { key: "paymentStatus", label: "Payment Status" },
      { key: "grandTotal", label: "Total", kind: "number" },
      { key: "comments", label: "Comments" },
      { key: "documents", label: "Vendor Documents" },
    ],
    purchaseOrders.map((row) => {
      const job = proposalById.get(String(row.serviceProposalId || ""));
      return {
        ...row,
        poType: text(row.poType) === "shop" ? "Shop" : "Job",
        jobNumber: text(row.jobNumber) || jobLabel(job),
        company: text(job?.companyName),
        documents: filesText(row.vendorDocuments),
      };
    }),
  );

  const poLines = [];
  const poPayments = [];
  for (const po of purchaseOrders) {
    const job = proposalById.get(String(po.serviceProposalId || ""));
    const jobNumber = text(po.jobNumber) || jobLabel(job);
    (Array.isArray(po.lineItems) ? po.lineItems : []).forEach((line) => {
      if (!text(line?.itemName) && num(line?.quantity) === "") return;
      const item = inventoryById.get(String(line?.inventoryItemId || ""));
      const qty = num(line?.quantity);
      const price = num(line?.price);
      poLines.push({
        poNumber: text(po.poNumber),
        vendorName: text(po.vendorName),
        jobNumber,
        itemName: text(line?.itemName),
        uom: text(line?.uom),
        quantity: qty,
        price,
        taxPercent: line?.taxPercent,
        lineTotal: qty === "" || price === "" ? "" : Number(qty) * Number(price),
        receivedQty: line?.receivedQty,
        receivingStatus: text(line?.receivingStatus),
        receivedDate: line?.receivedDate,
        inventoryItem: text(item?.name || item?.sku),
      });
    });
    (Array.isArray(po.payments) ? po.payments : []).forEach((pay) => {
      if (num(pay?.amount) === "" && !ymd(pay?.date)) return;
      poPayments.push({
        poNumber: text(po.poNumber),
        vendorName: text(po.vendorName),
        jobNumber,
        date: pay?.date,
        invoiceNumber: text(pay?.invoiceNumber),
        amount: pay?.amount,
        method: text(pay?.method),
        paidBy: text(pay?.paidBy),
        notes: text(pay?.notes),
      });
    });
  }

  put(
    "PO Line Items",
    [
      { key: "poNumber", label: "PO Number" },
      { key: "vendorName", label: "Vendor" },
      { key: "jobNumber", label: "Job Number" },
      { key: "itemName", label: "Item" },
      { key: "uom", label: "UOM" },
      { key: "quantity", label: "Quantity", kind: "number" },
      { key: "price", label: "Price", kind: "number" },
      { key: "taxPercent", label: "Tax Percent", kind: "number" },
      { key: "lineTotal", label: "Line Total", kind: "number" },
      { key: "receivedQty", label: "Received Qty", kind: "number" },
      { key: "receivingStatus", label: "Receiving Status" },
      { key: "receivedDate", label: "Received Date", kind: "date" },
      { key: "inventoryItem", label: "Inventory Item" },
    ],
    poLines,
  );
  put(
    "PO Payments",
    [
      { key: "poNumber", label: "PO Number" },
      { key: "vendorName", label: "Vendor" },
      { key: "jobNumber", label: "Job Number" },
      { key: "date", label: "Date", kind: "date" },
      { key: "invoiceNumber", label: "Invoice Number" },
      { key: "amount", label: "Amount", kind: "number" },
      { key: "method", label: "Method" },
      { key: "paidBy", label: "Paid By" },
      { key: "notes", label: "Notes" },
    ],
    poPayments,
  );

  const contents = workbook.addWorksheet("Contents");
  contents.addRow(["Collection", "Rows"]);
  const contentsHeader = contents.getRow(1);
  contentsHeader.font = { bold: true, color: { argb: "FF1F2937" } };
  contentsHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF5" } };
  for (const row of summary) contents.addRow([row.collection, row.rows]);
  contents.getColumn(1).width = 28;
  contents.getColumn(2).width = 12;
  contents.views = [{ state: "frozen", ySplit: 1 }];
  contents.autoFilter = { from: { row: 1, column: 1 }, to: { row: summary.length + 1, column: 2 } };
  const ordered = workbook.worksheets;
  const contentsIndex = ordered.indexOf(contents);
  if (contentsIndex > 0) {
    ordered.splice(contentsIndex, 1);
    ordered.unshift(contents);
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const stamp = new Date().toISOString().slice(0, 10);
  return { buffer, filename: `your-data-${stamp}.xlsx`, counts };
}
