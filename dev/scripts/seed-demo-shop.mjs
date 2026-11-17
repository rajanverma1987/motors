#!/usr/bin/env node
/**
 * Load sample shop data into the demo database only (3pf_demo).
 * Re-running replaces the previous demo_seed rows. Account, settings, and
 * subscription rows are left in place.
 *
 * Usage: node dev/scripts/seed-demo-shop.mjs
 */
import { createRequire } from "module";
import { randomUUID } from "crypto";
import fs from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const require = createRequire(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../clients/demo/package.json")
);
const mongoose = require("mongoose");

const SOURCE = "demo_seed";
const OWNER = "demo@3phaseflow.com";

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

function noon(iso) {
  return new Date(`${iso}T12:00:00.000Z`);
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function recentWeekdays(count) {
  const out = [];
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  while (out.length < count) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out.reverse();
}

function money(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function stamp(externalRef) {
  return {
    sourceSystem: SOURCE,
    externalRef,
    importBatchId: SOURCE,
    importedAt: new Date(),
    importStatus: "imported",
    createdByEmail: OWNER,
  };
}

function pickStatus(entries, needles, fallback) {
  const list = Array.isArray(entries) ? entries : [];
  for (const needle of needles) {
    const hit = list.find((e) => {
      const blob = `${e.value || ""} ${e.label || ""}`.toLowerCase();
      return blob.includes(needle);
    });
    if (hit?.value) return String(hit.value);
  }
  return list[0]?.value || fallback;
}

function jobNumber(prefix, n) {
  return `${prefix}A${String(n).padStart(5, "0")}`;
}

function poNumber(prefix, n) {
  const head = String(prefix || "P").replace(/-+$/, "") || "P";
  return `${head}-A${String(n).padStart(4, "0")}`;
}

const CUSTOMERS = [
  ["Gulf Coast Pump and Paper", "Lena Ortiz", "Houston", "TX", "77002", "713-555-0141", "ap@gulfcoastpump.example", "Net 30", false],
  ["Bayou Chemical", "Marcus Hale", "Pasadena", "TX", "77506", "281-555-0142", "purchasing@bayouchem.example", "Net 30", true],
  ["Lone Star Grain", "Priya Shah", "Katy", "TX", "77449", "832-555-0143", "maintenance@lonestargrain.example", "Net 15", true],
  ["Harbor Crane Services", "Evan Brooks", "Galveston", "TX", "77550", "409-555-0144", "shop@harborcrane.example", "Due on receipt", true],
  ["Mesa Water District", "Nora Kim", "Sugar Land", "TX", "77478", "281-555-0145", "plants@mesawater.example", "Net 45", false],
  ["Red River Aggregates", "Carlos Diaz", "Conroe", "TX", "77301", "936-555-0146", "buyer@redriveragg.example", "Net 30", true],
  ["Oak Bend Hospital Plant", "Helen Cho", "Richmond", "TX", "77469", "281-555-0147", "facilities@oakbend.example", "Net 30", true],
  ["Cactus Cold Storage", "Andre Wilson", "Baytown", "TX", "77520", "281-555-0148", "ops@cactuscold.example", "Net 15", false],
  ["Trinity Steel Fabrication", "Rita Nguyen", "Houston", "TX", "77020", "713-555-0149", "ap@trinitysteel.example", "Net 30", true],
  ["Pecan Grove Municipal", "Sam Patel", "Pecan Grove", "TX", "77406", "281-555-0150", "utilities@pecangrove.example", "Net 45", true],
];

const MOTORS = [
  ["Baldor", "EM4115T", "50", "1780", "460", "256T", "AC"],
  ["Siemens", "1LE2221", "25", "1765", "460", "284T", "AC"],
  ["US Motors", "H50P2D", "75", "1785", "460", "365T", "AC"],
  ["WEG", "01518ET3E", "15", "1760", "230", "254T", "AC"],
  ["Reliance", "P25G3202", "40", "1750", "500", "MC2812", "DC"],
  ["GE", "5K365AK205", "100", "1780", "460", "405T", "AC"],
  ["Toshiba", "B1004FLF2AMH", "10", "1745", "460", "215T", "AC"],
  ["Marathon", "GT1015A", "20", "1760", "575", "256T", "AC"],
  ["ABB", "M3BP160", "30", "1775", "460", "286T", "AC"],
  ["Nidec", "U25P2A", "60", "1180", "460", "364T", "AC"],
];

const SCOPES = [
  ["Stator rewind and dip", "Replace bearings and seals", "Final test and balance"],
  ["Incoming electrical test", "Varnish treatment", "Assemble and paint"],
  ["Armature rewind", "Commutator turn", "Brush rigging rebuild"],
  ["Pump wet end rebuild", "Mechanical seal", "Alignment and test"],
  ["Core loss test", "Coil manufacture", "Dip and bake"],
];

const VENDORS = [
  ["Houston Magnet Wire", "Dana Cole", "713-555-2101", "sales@hmwire.example", "Magnet wire, Nomex"],
  ["Gulf Bearing Supply", "Omar Farid", "713-555-2102", "orders@gulfbearing.example", "Bearings, seals"],
  ["Bayou Varnish Co", "Jill Parks", "281-555-2103", "desk@bayouvarnish.example", "Varnish, solvents"],
  ["Metro Electrical Parts", "Ken Ito", "832-555-2104", "parts@metroelec.example", "Lead wire, lugs"],
  ["Ship Channel Freight", "Amy Grant", "409-555-2105", "dispatch@scfreight.example", "Freight"],
  ["Lone Star Steel Supply", "Pete Alvarez", "936-555-2106", "sales@lssteel.example", "Shaft stock, keys"],
];

const EMPLOYEES = [
  ["Maya Chen", "Technician", "Winding", "hourly", "32", "E101", "Active"],
  ["Luis Romero", "Technician", "Winding", "hourly", "28", "E102", "Active"],
  ["Aisha Grant", "Technician", "Machine shop", "hourly", "30", "E103", "Active"],
  ["Ben Carter", "Technician", "Test", "hourly", "27", "E104", "Active"],
  ["Diane Walsh", "Lead", "Shop floor", "salary", "5200", "E105", "Active"],
  ["Chris Patel", "Office", "Accounting", "salary", "4100", "E106", "Active"],
  ["Jordan Blake", "Sales", "Outside sales", "salary", "3800", "E107", "Active"],
  ["Riley Nguyen", "Technician", "Winding", "hourly", "26", "E108", "Inactive"],
];

const SKUS = [
  ["14 AWG magnet wire", "MW-14", "lb", 420, 6.4, 35, "Wire room"],
  ["18 AWG magnet wire", "MW-18", "lb", 260, 7.1, 40, "Wire room"],
  ["Nomex slot liner", "INS-NOMEX", "ft", 800, 1.25, 50, "Insulation cage"],
  ["6312 bearing", "BRG-6312", "ea", 24, 48, 30, "Main cage"],
  ["6310 bearing", "BRG-6310", "ea", 18, 36, 30, "Main cage"],
  ["Class F varnish", "VAR-F", "gal", 12, 42, 25, "Paint room"],
  ["Lead wire 8 AWG", "LW-8", "ft", 500, 1.8, 40, "Wire room"],
  ["Shaft key stock", "KEY-1", "ft", 40, 3.5, 20, "Machine shop"],
  ["Mechanical seal kit", "SEAL-214", "ea", 6, 86, 25, "Main cage"],
  ["Balance weight putty", "BAL-1", "ea", 15, 9.5, 30, "Test bay"],
  ["Shop rags", "SUP-RAG", "ea", 30, 4, 15, "Receiving"],
  ["Spray paint gray", "PNT-GRY", "ea", 22, 8.75, 20, "Paint room"],
];

const env = {
  ...loadEnv(resolve(dirname(fileURLToPath(import.meta.url)), "../../.env")),
  ...loadEnv(resolve(dirname(fileURLToPath(import.meta.url)), "../../clients/demo/.env")),
};

if (!env.MONGODB_URI || !env.MONGODB_URI.includes("3pf_demo")) {
  console.error("Refusing to seed: MONGODB_URI is not the demo database.");
  process.exit(1);
}

await mongoose.connect(env.MONGODB_URI);
const db = mongoose.connection.db;
const now = new Date();

const settingsDoc = await db.collection("usersettings").findOne({ ownerEmail: OWNER });
const settings = settingsDoc?.settings || {};
const dropdowns = settings.controlledDropdowns || {};
const quoteEntries = dropdowns.quote_status?.entries || [];
const invoiceEntries = dropdowns.invoice_status?.entries || [];
const jobStatuses = Array.isArray(settings.workOrderStatuses) && settings.workOrderStatuses.length
  ? settings.workOrderStatuses
  : ["In Progress", "Waiting Parts", "Completed", "Shipped"];
const invoicePrefix = String(settings.prefixInvoice || "").replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 16);
const jobPrefix = invoicePrefix ? (invoicePrefix.endsWith("-") ? invoicePrefix : `${invoicePrefix}-`) : "";
const shopPoPrefix = String(settings.prefixShopPo || "P").replace(/[^a-zA-Z0-9\-_]/g, "").replace(/-+$/, "") || "P";

const quoteDraft = pickStatus(quoteEntries, ["prepar"], "service_proposal_preparation");
const quoteSent = pickStatus(quoteEntries, ["sent", "submitted"], "sent");
const quoteApproved = pickStatus(quoteEntries, ["approved regular", "approved"], "proposal_approved_regular");
const quoteRush = pickStatus(quoteEntries, ["rush"], quoteApproved);
const quoteRejected = pickStatus(quoteEntries, ["not approved", "reject"], "rejected");
const quoteRnr = pickStatus(quoteEntries, ["rnr", "return"], "rnr");
const invDraft = pickStatus(invoiceEntries, ["draft"], "draft");
const invSent = pickStatus(invoiceEntries, ["sent"], "sent");
const invPartial = pickStatus(invoiceEntries, ["partial"], "partial_paid");
const invPaid = pickStatus(invoiceEntries, ["fully", "paid"], "fully_paid");

async function wipe() {
  const employees = await db.collection("employees").find(
    { createdByEmail: OWNER, sourceSystem: SOURCE },
    { projection: { _id: 1 } }
  ).toArray();
  const proposals = await db.collection("simpleserviceproposals").find(
    { createdByEmail: OWNER, sourceSystem: SOURCE },
    { projection: { _id: 1 } }
  ).toArray();
  const items = await db.collection("inventoryitems").find(
    { createdByEmail: OWNER, sourceSystem: SOURCE },
    { projection: { _id: 1 } }
  ).toArray();
  const empIds = employees.map((d) => String(d._id));
  const propIds = proposals.map((d) => String(d._id));
  const itemIds = items.map((d) => d._id);

  if (empIds.length) {
    await db.collection("timeclockpunches").deleteMany({ createdByEmail: OWNER, employeeId: { $in: empIds } });
    await db.collection("timeclockmanualhours").deleteMany({ createdByEmail: OWNER, employeeId: { $in: empIds } });
    await db.collection("employeepayrollpayments").deleteMany({ createdByEmail: OWNER, employeeId: { $in: empIds } });
    await db.collection("employeedaypaidhours").deleteMany({ createdByEmail: OWNER, employeeId: { $in: empIds } });
  }
  if (propIds.length) {
    await db.collection("inventoryreservations").deleteMany({
      createdByEmail: OWNER,
      simpleServiceProposalId: { $in: propIds },
    });
  }
  if (itemIds.length) {
    await db.collection("inventorymovements").deleteMany({
      createdByEmail: OWNER,
      inventoryItemId: { $in: itemIds },
    });
  }

  const tagged = [
    "customers",
    "motors",
    "vendors",
    "employees",
    "inventoryitems",
    "simpleserviceproposals",
    "simplepurchaseorders",
    "leads",
    "salespersons",
    "salescommissions",
    "quotes",
    "invoices",
    "workorders",
    "purchaseorders",
  ];
  for (const name of tagged) {
    await db.collection(name).deleteMany({ createdByEmail: OWNER, sourceSystem: SOURCE });
  }
  await db.collection("simpleexpenses").deleteMany({ createdByEmail: OWNER, notes: "demo_seed" });
  await db.collection("activitylogs").deleteMany({ ownerEmail: OWNER, summary: /^Demo seed/ });
  await db.collection("ledgerentries").deleteMany({ createdByEmail: OWNER, description: /^Demo seed/ });
  await db.collection("logisticsentries").deleteMany({ createdByEmail: OWNER, notes: "demo_seed" });
}

await wipe();

const customers = CUSTOMERS.map((row, i) => {
  const [companyName, contact, city, state, zipCode, phone, email, terms, taxExempt] = row;
  return {
    ...stamp(`CUST-${1001 + i}`),
    customerNumber: String(1001 + i),
    companyName,
    primaryContactName: contact,
    phone,
    email,
    billingContact: contact,
    customerType: i % 3 === 0 ? "Municipal" : "Industrial",
    paymentTerms: terms,
    preferredPaymentMethod: i % 2 === 0 ? "Check" : "ACH",
    preferredContactMethod: "Email",
    address: `${120 + i} Industrial Blvd`,
    city,
    state,
    zipCode,
    country: "United States",
    shippingAddress: `${120 + i} Industrial Blvd`,
    shippingCity: city,
    shippingState: state,
    shippingZipCode: zipCode,
    shippingCountry: "United States",
    notes: "Sample customer for the demo shop.",
    creditLimit: String(25000 + i * 5000),
    taxExempt,
    taxPercent: taxExempt ? "0" : "8.25",
    createdAt: now,
    updatedAt: now,
  };
});
const customerResult = await db.collection("customers").insertMany(customers);
const customerIds = Object.values(customerResult.insertedIds).map(String);

const motors = [];
for (let i = 0; i < 20; i += 1) {
  const spec = MOTORS[i % MOTORS.length];
  const customerIndex = i % customerIds.length;
  motors.push({
    ...stamp(`MTR-${2001 + i}`),
    customerId: customerIds[customerIndex],
    customerSourceSystem: SOURCE,
    customerExternalRef: `CUST-${1001 + customerIndex}`,
    serialNumber: `SN${88000 + i}`,
    manufacturer: spec[0],
    model: spec[1],
    hp: spec[2],
    rpm: spec[3],
    voltage: spec[4],
    frameSize: spec[5],
    motorType: spec[6],
    notes: "Sample motor on file for this customer.",
    createdAt: now,
    updatedAt: now,
  });
}
const motorResult = await db.collection("motors").insertMany(motors);
const motorIds = Object.values(motorResult.insertedIds).map(String);

const vendors = VENDORS.map((row, i) => ({
  ...stamp(`VND-${3001 + i}`),
  name: row[0],
  contactName: row[1],
  phone: row[2],
  email: row[3],
  address: `${400 + i} Supplier Rd`,
  city: "Houston",
  state: "TX",
  zipCode: "77003",
  partsSupplied: [row[4]],
  paymentTerms: i % 2 === 0 ? "Net 30" : "Net 15",
  notes: "Sample vendor.",
  attachments: [],
  createdAt: now,
  updatedAt: now,
}));
const vendorResult = await db.collection("vendors").insertMany(vendors);
const vendorIds = Object.values(vendorResult.insertedIds).map(String);

const employees = EMPLOYEES.map((row, i) => {
  const [name, role, department, payType, rate, employeeNumber, employmentStatus] = row;
  return {
    ...stamp(`EMP-${4001 + i}`),
    name,
    email: `${employeeNumber.toLowerCase()}@demo-shop.example`,
    role,
    phone: `713-555-30${String(i).padStart(2, "0")}`,
    canLogin: false,
    financialAccess: role === "Office" ? "allowed" : "role",
    technicianAppAccess: role === "Technician",
    timeClockEnabled: true,
    employeeNumber,
    department,
    employmentStatus,
    hireDate: "2024-03-01",
    inactiveDate: employmentStatus === "Inactive" ? isoDaysAgo(12) : "",
    payType,
    hourlyRate: rate,
    scheduledStart: "07:00",
    scheduledEnd: "15:30",
    defaultBreakMinutes: 30,
    passkeys: [],
    attachments: [],
    expoPushTokens: [],
    createdAt: now,
    updatedAt: now,
  };
});
const employeeResult = await db.collection("employees").insertMany(employees);
const employeeDocs = EMPLOYEES.map((row, i) => ({
  id: String(employeeResult.insertedIds[i]),
  name: row[0],
  number: row[5],
  payType: row[3],
  rate: row[4],
  role: row[1],
  status: row[6],
}));

const inventory = SKUS.map((row, i) => ({
  ...stamp(`SKU-${row[1]}`),
  name: row[0],
  sku: row[1],
  uom: row[2],
  onHand: row[3],
  reserved: i < 3 ? 4 : 0,
  threshold: 5,
  unitCost: row[4],
  markupPercent: row[5],
  preferredVendorId: vendorIds[i % vendorIds.length],
  location: row[6],
  notes: "Sample stock.",
  createdAt: now,
  updatedAt: now,
}));
const inventoryResult = await db.collection("inventoryitems").insertMany(inventory);
const inventoryIds = Object.values(inventoryResult.insertedIds);

function scopeLines(seed, base) {
  const names = SCOPES[seed % SCOPES.length];
  return names.map((description, line) => ({
    id: randomUUID(),
    description,
    price: money(base + line * 350),
  }));
}

function otherLines(seed) {
  return [
    {
      id: randomUUID(),
      description: "Bearings and seals",
      uom: "ea",
      price: money(180 + seed * 15),
      qty: "2",
      inventoryItemId: "",
      taxable: true,
    },
  ];
}

function proposalTotals(scope, other, taxExempt) {
  const scopeTotal = scope.reduce((sum, line) => sum + Number(line.price), 0);
  const otherTotal = other.reduce((sum, line) => sum + Number(line.price) * Number(line.qty || 1), 0);
  const subtotal = scopeTotal + otherTotal;
  const tax = taxExempt ? 0 : Math.round(subtotal * 0.0825 * 100) / 100;
  return {
    proposalTotal: Math.round(subtotal * 100) / 100,
    taxCollected: tax,
    total: Math.round((subtotal + tax) * 100) / 100,
  };
}

const rfqStatuses = [quoteDraft, quoteSent, quoteApproved, quoteRush, quoteRejected, quoteRnr];
const proposals = [];

for (let i = 0; i < 6; i += 1) {
  const customerIndex = i % customerIds.length;
  const customer = customers[customerIndex];
  const spec = MOTORS[i % MOTORS.length];
  const scope = scopeLines(i, 900);
  const other = otherLines(i);
  const totals = proposalTotals(scope, other, customer.taxExempt);
  const number = jobNumber(jobPrefix, 21 + i);
  const day = isoDaysAgo(40 - i);
  proposals.push({
    ...stamp(`SSP-RFQ-${21 + i}`),
    ...totals,
    customerId: customerIds[customerIndex],
    documentNumber: number,
    quote: number,
    recordType: "RFQ",
    status: rfqStatuses[i],
    jobStatus: "",
    dateCreated: noon(day),
    date: noon(day),
    dueDate: noon(isoDaysAgo(20 - i)),
    companyName: customer.companyName,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    phone: customer.phone,
    email: customer.email,
    customerTaxExempt: customer.taxExempt,
    taxPercent: customer.taxPercent,
    motorPower: spec[6] === "DC" ? "DC" : "AC",
    namePlate: "Original",
    manufacturer: spec[0],
    hpKw: spec[2],
    frameType: spec[5],
    modelNumber: spec[1],
    volts: spec[4],
    amps: String(20 + i * 3),
    rpm: spec[3],
    customerPo: `CPO-${4100 + i}`,
    preparedBy: employeeDocs[i % 4].name,
    quotedBy: employeeDocs[6].name,
    proposalType: i % 2 === 0 ? "Service" : "Sales",
    quoteType: i % 2 === 0 ? "Email" : "Phone",
    proposalSubmitDate: i === 0 ? null : noon(isoDaysAgo(36 - i)),
    internalNotes: "Sample service proposal.",
    notes: "Sample service proposal.",
    customerNotes: "Call the plant before pickup.",
    scopeDetails: scope,
    otherItems: other,
    payments: [],
    attachments: [],
    jobDiagrams: [],
    createdAt: now,
    updatedAt: now,
  });
}

const jobs = [];
for (let i = 0; i < 20; i += 1) {
  const customerIndex = i % customerIds.length;
  const customer = customers[customerIndex];
  const spec = MOTORS[i % MOTORS.length];
  const scope = scopeLines(i, 1400);
  const other = otherLines(i);
  const totals = proposalTotals(scope, other, customer.taxExempt);
  const number = jobNumber(jobPrefix, i + 1);
  const day = isoDaysAgo(30 - i);
  const jobStatus = jobStatuses[i % jobStatuses.length];
  jobs.push({
    ...stamp(`SSP-JOB-${i + 1}`),
    ...totals,
    customerId: customerIds[customerIndex],
    documentNumber: number,
    quote: number,
    recordType: "JOB",
    status: i % 5 === 0 ? quoteRush : quoteApproved,
    jobStatus,
    dateCreated: noon(day),
    date: noon(day),
    dueDate: noon(isoDaysAgo(Math.max(0, 10 - i))),
    proposalAcceptedDate: noon(isoDaysAgo(28 - i)),
    acceptDate: noon(isoDaysAgo(28 - i)),
    companyName: customer.companyName,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    phone: customer.phone,
    email: customer.email,
    customerTaxExempt: customer.taxExempt,
    taxPercent: customer.taxPercent,
    motorPower: spec[6] === "DC" ? "DC" : "AC",
    namePlate: "Original",
    manufacturer: spec[0],
    hpKw: spec[2],
    frameType: spec[5],
    modelNumber: spec[1],
    volts: spec[4],
    amps: String(28 + i),
    rpm: spec[3],
    customerPo: `CPO-${5000 + i}`,
    shippingPo: i % 4 === 0 ? `SHP-${6000 + i}` : "",
    preparedBy: employeeDocs[i % 4].name,
    quotedBy: employeeDocs[6].name,
    proposalApprovedBy: employeeDocs[4].name,
    proposalType: "Service",
    quoteType: "Email",
    internalNotes: `Shop floor status: ${jobStatus}.`,
    notes: `Shop floor status: ${jobStatus}.`,
    customerNotes: "Keep the original nameplate with the motor.",
    scopeDetails: scope,
    otherItems: other,
    payments: [],
    attachments: [],
    jobDiagrams: [],
    motorReceiving: i % 2 === 0 ? {
      date: day,
      jobNumber: number,
      receivingPo: `RCV-${7000 + i}`,
      mannerOfTransport: "Customer truck",
      droppedBy: customer.primaryContactName,
      charges: "125.00",
      paidBy: "customer",
      chargeBackToClient: false,
      notes: "Received at the dock.",
      attachments: [],
    } : null,
    motorShipping: jobStatus === "SHIPPED" ? {
      date: isoDaysAgo(2),
      invoiceNumber: `${number}-1`,
      shippingPo: `SHP-${6000 + i}`,
      mannerOfTransport: "Shop truck",
      pickedBy: employeeDocs[2].name,
      charges: "180.00",
      paidBy: "company",
      chargeBackToClient: true,
      notes: "Delivered to the plant.",
      attachments: [],
    } : null,
    createdAt: now,
    updatedAt: now,
  });
}

const invoicePlans = [
  { status: invPaid, pay: "full" },
  { status: invPaid, pay: "full" },
  { status: invPaid, pay: "full" },
  { status: invPartial, pay: "half" },
  { status: invPartial, pay: "half" },
  { status: invSent, pay: "none" },
  { status: invSent, pay: "none" },
  { status: invDraft, pay: "none" },
  { status: invPaid, pay: "full" },
  { status: invPartial, pay: "half" },
];

const invoices = invoicePlans.map((plan, i) => {
  const job = jobs[i];
  const number = `${job.documentNumber}-1`;
  const total = job.total;
  const paid = plan.pay === "full" ? total : plan.pay === "half" ? Math.round(total * 0.4 * 100) / 100 : 0;
  const payDate = isoDaysAgo(8 - (i % 5));
  const payments = paid > 0 ? [{
    id: randomUUID(),
    date: payDate,
    amount: money(paid),
    method: i % 2 === 0 ? "Check" : "ACH",
    checkNumber: i % 2 === 0 ? String(88000 + i) : "",
    reference: i % 2 === 0 ? "" : `ACH-${9100 + i}`,
    notes: plan.pay === "full" ? "Paid in full." : "Partial payment.",
  }] : [];
  return {
    ...job,
    ...stamp(`SSP-INV-${i + 1}`),
    documentNumber: number,
    quote: number,
    recordType: "INVOICE",
    status: plan.status,
    jobStatus: jobs[i].jobStatus,
    invoiceSubmitDate: plan.status === invDraft ? null : noon(isoDaysAgo(12 - i)),
    invoicePaidDate: plan.pay === "full" ? noon(payDate) : null,
    payments,
    internalNotes: "Sample invoice.",
    notes: "Sample invoice.",
  };
});

const proposalResult = await db.collection("simpleserviceproposals").insertMany([
  ...proposals,
  ...jobs,
  ...invoices,
]);
const proposalIds = Object.values(proposalResult.insertedIds).map(String);
const jobIds = proposalIds.slice(6, 26);

const reservations = [0, 1, 2].map((i) => ({
  createdByEmail: OWNER,
  quoteId: "",
  simpleServiceProposalId: jobIds[i],
  workOrderId: "",
  inventoryItemId: inventoryIds[i],
  qty: 4,
  status: "active",
  createdAt: now,
  updatedAt: now,
}));
await db.collection("inventoryreservations").insertMany(reservations);

function poLine(name, qty, price, status, received) {
  return {
    id: randomUUID(),
    itemName: name,
    uom: "ea",
    quantity: String(qty),
    price: money(price),
    taxPercent: "0",
    receivedQty: String(received),
    receivingStatus: status,
    receivedDate: status === "Received" ? isoDaysAgo(4) : "",
    vendorInvoiceNumber: status === "Received" ? `VI-${7700 + Math.round(price)}` : "",
    inventoryItemId: "",
    inventorySku: "",
    inventoryName: "",
    addToInventory: false,
    inventoryMarkupPercent: "",
    cancelled: false,
    cancelledAt: "",
    cancellationReason: "",
    returned: false,
    returnedAt: "",
    returnTrackingNumber: "",
    returnReason: "",
    returnShippingCharge: "",
    returnPaidBy: "",
  };
}

const simplePos = [];
for (let i = 0; i < 12; i += 1) {
  const vendorIndex = i % vendorIds.length;
  const lines = [
    poLine("Magnet wire", 20, 6.4, i % 3 === 0 ? "Ordered" : "Received", i % 3 === 0 ? 0 : 20),
    poLine("Bearings", 2, 48, i % 3 === 1 ? "Partially Received" : "Received", i % 3 === 1 ? 1 : 2),
  ];
  const grand = lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.price), 0);
  const payRatio = i % 3 === 0 ? 0 : i % 3 === 1 ? 0.5 : 1;
  const paid = Math.round(grand * payRatio * 100) / 100;
  const paymentStatus = paid <= 0 ? "Unpaid" : paid + 0.01 >= grand ? "Paid" : "Partial Paid";
  const day = isoDaysAgo(18 - i);
  simplePos.push({
    ...stamp(`SPO-${8001 + i}`),
    poType: "job",
    serviceProposalId: jobIds[i],
    jobNumber: jobs[i].documentNumber,
    poNumber: poNumber(shopPoPrefix, i + 1),
    vendorId: vendorIds[vendorIndex],
    vendorName: vendors[vendorIndex].name,
    vendorPhone: vendors[vendorIndex].phone,
    paymentStatus,
    poCutDate: noon(day),
    dueDate: noon(isoDaysAgo(Math.max(0, 6 - i))),
    poPaidDate: paid > 0 ? noon(isoDaysAgo(3)) : null,
    paymentMethod: paid > 0 ? "Check" : "",
    paidBy: paid > 0 ? employeeDocs[5].name : "",
    comments: "Sample job purchase order.",
    shippingCharge: "25.00",
    lineItems: lines,
    payments: paid > 0 ? [{
      id: randomUUID(),
      date: isoDaysAgo(3),
      invoiceNumber: `VI-${8100 + i}`,
      amount: money(paid),
      method: "Check",
      checkNumber: String(44000 + i),
      paidBy: employeeDocs[5].name,
      notes: paymentStatus === "Paid" ? "Paid in full." : "Deposit.",
    }] : [],
    vendorDocuments: [],
    sentToVendorAt: noon(day).toISOString(),
    sentToVendorEmail: vendors[vendorIndex].email,
    createdAt: now,
    updatedAt: now,
  });
}
for (let i = 0; i < 4; i += 1) {
  const vendorIndex = i % vendorIds.length;
  const lines = [poLine("Shop supplies", 5, 18, "Ordered", 0)];
  const grand = 90;
  simplePos.push({
    ...stamp(`SPO-SHOP-${i + 1}`),
    poType: "shop",
    serviceProposalId: "",
    jobNumber: "",
    poNumber: poNumber(shopPoPrefix, 13 + i),
    vendorId: vendorIds[vendorIndex],
    vendorName: vendors[vendorIndex].name,
    vendorPhone: vendors[vendorIndex].phone,
    paymentStatus: "Unpaid",
    poCutDate: noon(isoDaysAgo(5 - i)),
    dueDate: noon(isoDaysAgo(0)),
    comments: "Sample shop purchase order.",
    shippingCharge: "0",
    lineItems: lines,
    payments: [],
    vendorDocuments: [],
    total: grand,
    createdAt: now,
    updatedAt: now,
  });
}
await db.collection("simplepurchaseorders").insertMany(simplePos);

const expenseCategories = ["Shop supplies", "Freight", "Tools", "Utilities", "Meals"];
const expenses = expenseCategories.concat(["Shop supplies", "Freight", "Tools"]).map((category, i) => ({
  expenseDate: isoDaysAgo(i + 1),
  category,
  creditCardNumber: i % 2 === 0 ? "4421" : "",
  employeeId: employeeDocs[i % employeeDocs.length].id,
  employeeName: employeeDocs[i % employeeDocs.length].name,
  amount: 40 + i * 17.5,
  notes: "demo_seed",
  createdByEmail: OWNER,
  createdAt: now,
  updatedAt: now,
}));
await db.collection("simpleexpenses").insertMany(expenses);

const leads = [
  ["Hank Miller", "hank@riverpump.example", "River Pump Station", "new", "AC motor overheating"],
  ["Grace Owens", "grace@northmill.example", "North Mill", "contacted", "DC motor will not start"],
  ["Victor Lang", "victor@portgrain.example", "Port Grain", "quoted", "Need a rewind quote this week"],
  ["Elena Ruiz", "elena@citywater.example", "City Water", "won", "Awarded the 75 HP rewind"],
  ["Tom Becker", "tom@hillquarry.example", "Hill Quarry", "lost", "Went with another shop"],
  ["Nina Shah", "nina@coldbox.example", "Cold Box Foods", "new", "Bearing noise on a compressor motor"],
  ["Paul Green", "paul@dockworks.example", "Dock Works", "contacted", "Crane motor trip"],
  ["Ivy Brooks", "ivy@pecanplant.example", "Pecan Plant", "quoted", "Two motors for a shutdown"],
].map((row, i) => ({
  ...stamp(`LEAD-${9001 + i}`),
  name: row[0],
  email: row[1],
  phone: `832-555-41${String(i).padStart(2, "0")}`,
  company: row[2],
  city: "Houston",
  zipCode: "77002",
  motorType: i % 2 === 0 ? "AC" : "DC",
  motorHp: String(25 + i * 10),
  voltage: "460",
  problemDescription: row[4],
  message: row[4],
  urgencyLevel: i % 3 === 0 ? "Rush" : "Normal",
  buyerType: "industrial_plant",
  status: row[3],
  leadSource: "manual",
  leadType: "repair_request",
  lostReason: row[3] === "lost" ? "Awarded to another shop" : "",
  createdAt: now,
  updatedAt: now,
}));
await db.collection("leads").insertMany(leads);

const salesPeople = [
  { name: "Jordan Blake", phone: "713-555-0191", email: "jordan@demo-shop.example", ref: "SP-1" },
  { name: "Diane Walsh", phone: "713-555-0192", email: "diane@demo-shop.example", ref: "SP-2" },
].map((row) => ({
  ...stamp(row.ref),
  name: row.name,
  phone: row.phone,
  email: row.email,
  bankDetail: "Demo account ending 4421",
  createdAt: now,
  updatedAt: now,
}));
const salesResult = await db.collection("salespersons").insertMany(salesPeople);
const salesIds = Object.values(salesResult.insertedIds).map(String);

const commissions = [0, 1, 2, 3, 4, 5].map((i) => ({
  ...stamp(`COM-${i + 1}`),
  quoteId: "",
  rfqNumber: jobs[i].documentNumber,
  repairFlowJobId: jobIds[i],
  jobNumber: jobs[i].documentNumber,
  salesPersonId: salesIds[i % 2],
  salesPersonSourceSystem: SOURCE,
  salesPersonExternalRef: i % 2 === 0 ? "SP-1" : "SP-2",
  jobSourceSystem: SOURCE,
  jobExternalRef: `SSP-JOB-${i + 1}`,
  amount: 150 + i * 75,
  attachments: [],
  status: i < 3 ? "paid" : "unpaid",
  paidAt: i < 3 ? noon(isoDaysAgo(6)) : null,
  notes: i < 3 ? "Paid with the monthly draw." : "Open commission.",
  createdAt: now,
  updatedAt: now,
}));
await db.collection("salescommissions").insertMany(commissions);

const weekdays = recentWeekdays(10);
const punches = [];
for (const tech of employeeDocs.filter((e) => e.payType === "hourly" && e.status === "Active")) {
  for (const day of weekdays) {
    const base = `${day}T`;
    const rows = [
      ["in", `${base}13:00:00.000Z`],
      ["break_start", `${base}18:00:00.000Z`],
      ["break_end", `${base}18:30:00.000Z`],
      ["out", `${base}21:30:00.000Z`],
    ];
    for (const [type, at] of rows) {
      punches.push({
        createdByEmail: OWNER,
        employeeId: tech.id,
        employeeName: tech.name,
        employeeNumber: tech.number,
        type,
        punchedAt: new Date(at),
        source: "manager_edit",
        note: "",
        voidedAt: null,
        voidReason: "",
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}
await db.collection("timeclockpunches").insertMany(punches);

const saturday = (() => {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
})();
await db.collection("timeclockmanualhours").insertMany([
  {
    createdByEmail: OWNER,
    employeeId: employeeDocs[0].id,
    employeeName: employeeDocs[0].name,
    employeeNumber: employeeDocs[0].number,
    workDate: saturday,
    hours: 4,
    note: "Saturday callout, payable manual hours.",
    proposalId: "",
    documentNumber: "",
    jobStatus: "",
    voidedAt: null,
    createdByUserEmail: OWNER,
    createdAt: now,
    updatedAt: now,
  },
  {
    createdByEmail: OWNER,
    employeeId: employeeDocs[1].id,
    employeeName: employeeDocs[1].name,
    employeeNumber: employeeDocs[1].number,
    workDate: weekdays[weekdays.length - 1],
    hours: 2,
    note: "Extra time on the job.",
    proposalId: jobIds[0],
    documentNumber: jobs[0].documentNumber,
    jobStatus: jobs[0].jobStatus,
    voidedAt: null,
    createdByUserEmail: OWNER,
    createdAt: now,
    updatedAt: now,
  },
]);

await db.collection("employeedaypaidhours").insertOne({
  createdByEmail: OWNER,
  employeeId: employeeDocs[0].id,
  workDate: weekdays[0],
  paidHours: 8,
  createdAt: now,
  updatedAt: now,
});

await db.collection("employeepayrollpayments").insertMany([
  {
    createdByEmail: OWNER,
    employeeId: employeeDocs[0].id,
    employeeName: employeeDocs[0].name,
    employeeNumber: employeeDocs[0].number,
    periodMonth: weekdays[0].slice(0, 7),
    periodFrom: weekdays[0],
    periodTo: weekdays[4],
    payType: "hourly",
    hourlyRate: employeeDocs[0].rate,
    hours: 40,
    hoursDue: 40,
    amount: 40 * Number(employeeDocs[0].rate),
    status: "paid",
    paidAt: noon(isoDaysAgo(2)),
    paymentMethod: "ACH",
    notes: "Sample hourly payroll.",
    attachments: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    createdByEmail: OWNER,
    employeeId: employeeDocs[4].id,
    employeeName: employeeDocs[4].name,
    employeeNumber: employeeDocs[4].number,
    periodMonth: isoDaysAgo(2).slice(0, 7),
    periodFrom: isoDaysAgo(16),
    periodTo: isoDaysAgo(2),
    payType: "salary",
    hourlyRate: employeeDocs[4].rate,
    hours: 0,
    hoursDue: null,
    amount: Number(employeeDocs[4].rate),
    status: "paid",
    paidAt: noon(isoDaysAgo(2)),
    paymentMethod: "Check",
    notes: "Sample salary payroll.",
    attachments: [],
    createdAt: now,
    updatedAt: now,
  },
]);

const movements = inventoryIds.slice(0, 4).map((id, i) => ({
  createdByEmail: OWNER,
  inventoryItemId: id,
  qty: i === 3 ? -2 : 20,
  type: i === 3 ? "issue_job" : "receive_po",
  purchaseOrderId: "",
  poNumber: i === 3 ? "" : simplePos[0].poNumber,
  vendorName: i === 3 ? "" : vendors[0].name,
  simpleServiceProposalId: i === 3 ? jobIds[0] : "",
  documentNumber: i === 3 ? jobs[0].documentNumber : "",
  notes: "demo_seed",
  reason: i === 3 ? "Issued to a sample job." : "Received on a sample PO.",
  balanceAfter: SKUS[i][3],
  createdAt: now,
  updatedAt: now,
}));
await db.collection("inventorymovements").insertMany(movements);

const classicQuotes = [];
for (let i = 0; i < 10; i += 1) {
  const number = jobNumber(jobPrefix, 41 + i);
  classicQuotes.push({
    ...stamp(`QTE-${41 + i}`),
    customerId: customerIds[i],
    customerSourceSystem: SOURCE,
    customerExternalRef: `CUST-${1001 + i}`,
    motorId: motorIds[i],
    motorSourceSystem: SOURCE,
    motorExternalRef: `MTR-${2001 + i}`,
    leadId: "",
    status: i < 3 ? "sent" : i < 7 ? "approved" : "draft",
    customerPo: `CPO-${3000 + i}`,
    date: isoDaysAgo(20 - i),
    preparedBy: employeeDocs[5].name,
    technicianEmployeeId: employeeDocs[i % 4].id,
    rfqNumber: number,
    repairScope: "Rewind and bearings",
    laborTotal: "1800",
    partsTotal: "420",
    customerTaxExempt: customers[i].taxExempt,
    customerTaxPercent: customers[i].taxPercent,
    scopeLines: [{ scope: "Rewind stator", price: "1800" }],
    partsLines: [{ item: "Bearings", qty: "2", uom: "ea", price: "210" }],
    customerNotes: "Sample classic quote.",
    notes: "Sample classic quote.",
    attachments: [],
    statusLog: [],
    createdAt: now,
    updatedAt: now,
  });
}
const quoteResult = await db.collection("quotes").insertMany(classicQuotes);
const quoteIds = Object.values(quoteResult.insertedIds).map(String);

const classicInvoices = quoteIds.slice(0, 6).map((quoteId, i) => ({
  ...stamp(`INV-${41 + i}`),
  quoteId,
  quoteSourceSystem: SOURCE,
  quoteExternalRef: `QTE-${41 + i}`,
  customerId: customerIds[i],
  customerSourceSystem: SOURCE,
  customerExternalRef: `CUST-${1001 + i}`,
  motorId: motorIds[i],
  motorSourceSystem: SOURCE,
  motorExternalRef: `MTR-${2001 + i}`,
  invoiceNumber: `${classicQuotes[i].rfqNumber}-1`,
  rfqNumber: classicQuotes[i].rfqNumber,
  customerPo: classicQuotes[i].customerPo,
  date: isoDaysAgo(8 - i),
  preparedBy: employeeDocs[5].name,
  scopeLines: classicQuotes[i].scopeLines,
  partsLines: classicQuotes[i].partsLines,
  laborTotal: "1800",
  partsTotal: "420",
  customerTaxExempt: customers[i].taxExempt,
  customerTaxPercent: customers[i].taxPercent,
  customerNotes: "Sample classic invoice.",
  notes: "Sample classic invoice.",
  status: i < 2 ? "fully_paid" : i < 4 ? "partial_paid" : "sent",
  payments: i < 4 ? [{
    amount: i < 2 ? "2220.00" : "800.00",
    paymentDate: isoDaysAgo(3),
    method: "Check",
    reference: String(55000 + i),
    notes: "Sample payment.",
    recordedAt: now,
  }] : [],
  createdAt: now,
  updatedAt: now,
}));
await db.collection("invoices").insertMany(classicInvoices);

const workOrders = quoteIds.map((quoteId, i) => ({
  ...stamp(`WO-${41 + i}`),
  quoteId,
  quoteSourceSystem: SOURCE,
  quoteExternalRef: `QTE-${41 + i}`,
  repairFlowJobId: "",
  repairJobNumber: classicQuotes[i].rfqNumber,
  motorId: motorIds[i],
  motorSourceSystem: SOURCE,
  motorExternalRef: `MTR-${2001 + i}`,
  customerId: customerIds[i],
  customerSourceSystem: SOURCE,
  customerExternalRef: `CUST-${1001 + i}`,
  workOrderNumber: `W-${classicQuotes[i].rfqNumber}-1`,
  date: isoDaysAgo(18 - i),
  technicianEmployeeId: employeeDocs[i % 4].id,
  jobType: "complete_motor",
  motorClass: MOTORS[i % MOTORS.length][6] === "DC" ? "DC" : "AC",
  status: jobStatuses[i % jobStatuses.length],
  companyName: customers[i].companyName,
  quoteRfqNumber: classicQuotes[i].rfqNumber,
  notes: "Sample work order.",
  acSpecs: {},
  dcSpecs: {},
  armatureSpecs: {},
  technicianAppNotes: [],
  createdAt: now,
  updatedAt: now,
}));
await db.collection("workorders").insertMany(workOrders);

const classicPos = vendorIds.slice(0, 6).map((vendorId, i) => ({
  ...stamp(`PO-${41 + i}`),
  poNumber: `P${String(41 + i).padStart(5, "0")}`,
  vendorId,
  vendorSourceSystem: SOURCE,
  vendorExternalRef: `VND-${3001 + i}`,
  type: i < 4 ? "job" : "shop",
  quoteId: i < 4 ? quoteIds[i] : "",
  lineItems: [{
    description: "Magnet wire",
    qty: "10",
    uom: "lb",
    unitPrice: "6.40",
    taxPercent: "0",
    inventoryItemId: "",
    status: i % 2 === 0 ? "Received" : "Ordered",
  }],
  vendorInvoices: [],
  notes: "Sample classic purchase order.",
  createdAt: now,
  updatedAt: now,
}));
await db.collection("purchaseorders").insertMany(classicPos);

await db.collection("ledgerentries").insertMany([
  ["Customer receipt", customers[0].companyName, "", "2400", "0", "0", "paid"],
  ["Vendor bill", vendors[0].name, "640", "", "0", "640", "open"],
  ["Customer receipt", customers[1].companyName, "", "900", "1500", "0", "partial"],
  ["Shop expense", "Utilities", "310", "", "0", "0", "paid"],
].map((row, i) => ({
  date: isoDaysAgo(i + 1),
  description: `Demo seed ${row[0].toLowerCase()}`,
  party: row[1],
  debit: row[2],
  credit: row[3],
  receivable: row[4],
  payable: row[5],
  status: row[6],
  sourceType: "manual",
  sourceId: "",
  createdByEmail: OWNER,
  createdAt: now,
  updatedAt: now,
})));

await db.collection("logisticsentries").insertMany([
  {
    createdByEmail: OWNER,
    kind: "motor_receiving",
    date: isoDaysAgo(6),
    jobNumber: jobs[0].documentNumber,
    mannerOfTransport: "Customer truck",
    droppedBy: customers[0].primaryContactName,
    charges: "125.00",
    paidBy: "customer",
    notes: "demo_seed",
    createdAt: now,
    updatedAt: now,
  },
  {
    createdByEmail: OWNER,
    kind: "motor_shipping",
    date: isoDaysAgo(2),
    jobNumber: jobs[1].documentNumber,
    shippingPo: jobs[1].shippingPo || `SHP-${jobs[1].documentNumber}`,
    mannerOfTransport: "Shop truck",
    pickedBy: employeeDocs[2].name,
    charges: "180.00",
    paidBy: "company",
    notes: "demo_seed",
    createdAt: now,
    updatedAt: now,
  },
]);

const activity = [
  ["created", "customer", customerIds[0], customers[0].customerNumber, customers[0].companyName, "Demo seed customer Gulf Coast Pump and Paper."],
  ["created", "job", jobIds[0], jobs[0].documentNumber, jobs[0].companyName, "Demo seed job opened."],
  ["payment", "invoice", "", invoices[0].documentNumber, invoices[0].companyName, "Demo seed invoice payment recorded."],
  ["created", "purchase_order", "", simplePos[0].poNumber, simplePos[0].vendorName, "Demo seed purchase order cut."],
].map((row) => ({
  ownerEmail: OWNER,
  actorEmail: OWNER,
  actorName: "Demo",
  action: row[0],
  recordKind: row[1],
  recordId: row[2],
  recordNumber: row[3],
  partyName: row[4],
  summary: row[5],
  changes: [],
  snapshot: null,
  createdAt: now,
  updatedAt: now,
}));
await db.collection("activitylogs").insertMany(activity);

const summary = {
  customers: customerIds.length,
  motors: motorIds.length,
  vendors: vendorIds.length,
  employees: employeeDocs.length,
  inventory: inventoryIds.length,
  rfqs: 6,
  jobs: 20,
  invoices: invoices.length,
  purchaseOrders: simplePos.length,
  expenses: expenses.length,
  leads: leads.length,
  salesPeople: salesIds.length,
  commissions: commissions.length,
  punches: punches.length,
  classicQuotes: classicQuotes.length,
  classicInvoices: classicInvoices.length,
  workOrders: workOrders.length,
};
console.log(JSON.stringify(summary, null, 2));
await mongoose.disconnect();
