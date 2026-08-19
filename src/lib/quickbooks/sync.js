import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
import Vendor from "@/models/Vendor";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import QuickBooksSyncLog from "@/models/QuickBooksSyncLog";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { QBO_SOURCE_SYSTEM } from "@/lib/quickbooks/constants";
import { getActiveConnection, qboQuery, qboRequest } from "@/lib/quickbooks/client";
import {
  mapBillPaymentToQbo,
  mapBillToQbo,
  mapCustomerToQbo,
  mapInvoiceToQbo,
  mapPaymentToQbo,
  mapVendorToQbo,
} from "@/lib/quickbooks/mappers";
import { parseSpMoney, roundSpMoney } from "@/lib/simple-service-proposal-form";
import { parsePoMoney, roundPoMoney } from "@/lib/simple-purchase-order-form";

async function writeLog({
  ownerEmail,
  entityType,
  localId,
  quickBooksId,
  action,
  status,
  message,
}) {
  try {
    await connectDB();
    await QuickBooksSyncLog.create({
      ownerEmail: String(ownerEmail || "").trim().toLowerCase(),
      entityType,
      localId: String(localId || ""),
      quickBooksId: String(quickBooksId || ""),
      action: action === "update" ? "update" : "create",
      status: status === "error" ? "error" : "success",
      message: String(message || "").slice(0, 2000),
      occurredAt: new Date(),
    });
  } catch (err) {
    console.error("QuickBooks sync log write failed:", err);
  }
}

async function loadShopSettings(ownerEmail) {
  await connectDB();
  const email = String(ownerEmail || "").trim().toLowerCase();
  const doc = await UserSettings.findOne({ ownerEmail: email }).lean();
  return mergeUserSettings(doc?.settings);
}

/**
 * @param {string} ownerEmail
 */
export async function isQuickBooksSyncActive(ownerEmail) {
  const settings = await loadShopSettings(ownerEmail);
  if (!settings.quickBooksEnabled) return false;
  const conn = await getActiveConnection(ownerEmail);
  return !!conn;
}

async function ensureServiceItem(ownerEmail, incomeAccountId) {
  const name = "IQMotorBase Service";
  try {
    const data = await qboQuery(
      ownerEmail,
      `select * from Item where Name = '${name.replace(/'/g, "\\'")}' maxresults 1`
    );
    const existing = data?.QueryResponse?.Item?.[0];
    if (existing?.Id) return String(existing.Id);
  } catch {
    /* create below */
  }
  if (!incomeAccountId) {
    throw new Error("Select a default income account in Settings → Accounts → QuickBooks.");
  }
  const created = await qboRequest(ownerEmail, "POST", "/item", {
    Name: name,
    Type: "Service",
    IncomeAccountRef: { value: String(incomeAccountId) },
  });
  const id = created?.Item?.Id;
  if (!id) throw new Error("Failed to create QuickBooks service item.");
  return String(id);
}

async function findBankAccountId(ownerEmail) {
  try {
    const data = await qboQuery(
      ownerEmail,
      "select * from Account where AccountType = 'Bank' and Active = true maxresults 10"
    );
    const first = data?.QueryResponse?.Account?.[0];
    return first?.Id ? String(first.Id) : "";
  } catch {
    return "";
  }
}

/**
 * @param {string} ownerEmail
 * @param {object} customerDoc
 */
export async function syncCustomerToQbo(ownerEmail, customerDoc) {
  const localId = String(customerDoc?._id || customerDoc?.id || "");
  const existingRef =
    customerDoc?.sourceSystem === QBO_SOURCE_SYSTEM && customerDoc?.externalRef
      ? String(customerDoc.externalRef)
      : "";
  const body = mapCustomerToQbo(customerDoc);
  let action = "create";
  let qboId = "";
  try {
    if (existingRef) {
      const current = await qboRequest(ownerEmail, "GET", `/customer/${existingRef}`);
      const cust = current?.Customer;
      if (cust?.Id) {
        action = "update";
        const updated = await qboRequest(ownerEmail, "POST", "/customer", {
          ...body,
          Id: cust.Id,
          SyncToken: cust.SyncToken,
          sparse: true,
        });
        qboId = String(updated?.Customer?.Id || cust.Id);
      }
    }
    if (!qboId) {
      const created = await qboRequest(ownerEmail, "POST", "/customer", body);
      qboId = String(created?.Customer?.Id || "");
      action = "create";
    }
    if (!qboId) throw new Error("No Customer Id returned from QuickBooks.");
    await Customer.updateOne(
      { _id: localId, createdByEmail: String(ownerEmail).toLowerCase() },
      { $set: { sourceSystem: QBO_SOURCE_SYSTEM, externalRef: qboId } }
    );
    await writeLog({
      ownerEmail,
      entityType: "customer",
      localId,
      quickBooksId: qboId,
      action,
      status: "success",
      message: "Customer synced",
    });
    return qboId;
  } catch (err) {
    await writeLog({
      ownerEmail,
      entityType: "customer",
      localId,
      quickBooksId: existingRef,
      action,
      status: "error",
      message: err.message || "Customer sync failed",
    });
    throw err;
  }
}

/**
 * @param {string} ownerEmail
 * @param {object} vendorDoc
 */
export async function syncVendorToQbo(ownerEmail, vendorDoc) {
  const localId = String(vendorDoc?._id || vendorDoc?.id || "");
  const existingRef =
    vendorDoc?.sourceSystem === QBO_SOURCE_SYSTEM && vendorDoc?.externalRef
      ? String(vendorDoc.externalRef)
      : "";
  const body = mapVendorToQbo(vendorDoc);
  let action = "create";
  let qboId = "";
  try {
    if (existingRef) {
      const current = await qboRequest(ownerEmail, "GET", `/vendor/${existingRef}`);
      const vend = current?.Vendor;
      if (vend?.Id) {
        action = "update";
        const updated = await qboRequest(ownerEmail, "POST", "/vendor", {
          ...body,
          Id: vend.Id,
          SyncToken: vend.SyncToken,
          sparse: true,
        });
        qboId = String(updated?.Vendor?.Id || vend.Id);
      }
    }
    if (!qboId) {
      const created = await qboRequest(ownerEmail, "POST", "/vendor", body);
      qboId = String(created?.Vendor?.Id || "");
      action = "create";
    }
    if (!qboId) throw new Error("No Vendor Id returned from QuickBooks.");
    await Vendor.updateOne(
      { _id: localId, createdByEmail: String(ownerEmail).toLowerCase() },
      { $set: { sourceSystem: QBO_SOURCE_SYSTEM, externalRef: qboId } }
    );
    await writeLog({
      ownerEmail,
      entityType: "vendor",
      localId,
      quickBooksId: qboId,
      action,
      status: "success",
      message: "Vendor synced",
    });
    return qboId;
  } catch (err) {
    await writeLog({
      ownerEmail,
      entityType: "vendor",
      localId,
      quickBooksId: existingRef,
      action,
      status: "error",
      message: err.message || "Vendor sync failed",
    });
    throw err;
  }
}

async function resolveCustomerQboId(ownerEmail, customerId) {
  const id = String(customerId || "").trim();
  if (!id) throw new Error("Invoice/customer missing customerId.");
  await connectDB();
  const customer = await Customer.findOne({
    _id: id,
    createdByEmail: String(ownerEmail).toLowerCase(),
  }).lean();
  if (!customer) throw new Error("Customer not found for QuickBooks sync.");
  if (customer.sourceSystem === QBO_SOURCE_SYSTEM && customer.externalRef) {
    return String(customer.externalRef);
  }
  return syncCustomerToQbo(ownerEmail, customer);
}

/**
 * @param {string} ownerEmail
 * @param {object} invoiceDoc - SimpleServiceProposal INVOICE
 */
export async function syncInvoiceToQbo(ownerEmail, invoiceDoc) {
  const localId = String(invoiceDoc?._id || invoiceDoc?.id || "");
  const settings = await loadShopSettings(ownerEmail);
  const incomeAccountId = String(settings.quickBooksDefaultIncomeAccountId || "").trim();
  let action = "create";
  let qboId = "";
  try {
    const customerQboId = await resolveCustomerQboId(ownerEmail, invoiceDoc.customerId);
    const itemId = await ensureServiceItem(ownerEmail, incomeAccountId);
    const existingRef =
      invoiceDoc?.sourceSystem === QBO_SOURCE_SYSTEM && invoiceDoc?.externalRef
        ? String(invoiceDoc.externalRef)
        : "";
    let existing = null;
    if (existingRef) {
      try {
        const cur = await qboRequest(ownerEmail, "GET", `/invoice/${existingRef}`);
        existing = cur?.Invoice || null;
      } catch {
        existing = null;
      }
    }
    const body = mapInvoiceToQbo(invoiceDoc, customerQboId, itemId, existing);
    if (existing?.Id) {
      action = "update";
      const updated = await qboRequest(ownerEmail, "POST", "/invoice", body);
      qboId = String(updated?.Invoice?.Id || existing.Id);
    } else {
      const created = await qboRequest(ownerEmail, "POST", "/invoice", body);
      qboId = String(created?.Invoice?.Id || "");
    }
    if (!qboId) throw new Error("No Invoice Id returned from QuickBooks.");
    await SimpleServiceProposal.updateOne(
      { _id: localId, createdByEmail: String(ownerEmail).toLowerCase() },
      { $set: { sourceSystem: QBO_SOURCE_SYSTEM, externalRef: qboId } }
    );
    await writeLog({
      ownerEmail,
      entityType: "invoice",
      localId,
      quickBooksId: qboId,
      action,
      status: "success",
      message: "Invoice synced",
    });

    await syncInvoicePaymentsToQbo(ownerEmail, {
      ...invoiceDoc,
      externalRef: qboId,
      sourceSystem: QBO_SOURCE_SYSTEM,
    }, customerQboId);

    return qboId;
  } catch (err) {
    await writeLog({
      ownerEmail,
      entityType: "invoice",
      localId,
      quickBooksId: qboId,
      action,
      status: "error",
      message: err.message || "Invoice sync failed",
    });
    throw err;
  }
}

/**
 * @param {string} ownerEmail
 * @param {object} invoiceDoc
 * @param {string} [customerQboId]
 */
export async function syncInvoicePaymentsToQbo(ownerEmail, invoiceDoc, customerQboId) {
  const localId = String(invoiceDoc?._id || invoiceDoc?.id || "");
  const invoiceQboId =
    invoiceDoc?.sourceSystem === QBO_SOURCE_SYSTEM && invoiceDoc?.externalRef
      ? String(invoiceDoc.externalRef)
      : "";
  if (!invoiceQboId) return;

  const custId =
    customerQboId || (await resolveCustomerQboId(ownerEmail, invoiceDoc.customerId));
  const refs =
    invoiceDoc?.quickbooksPaymentRefs && typeof invoiceDoc.quickbooksPaymentRefs === "object"
      ? { ...invoiceDoc.quickbooksPaymentRefs }
      : {};
  const payments = Array.isArray(invoiceDoc?.payments) ? invoiceDoc.payments : [];
  let changed = false;

  for (const p of payments) {
    const pid = String(p?.id || "").trim();
    if (!pid) continue;
    if (refs[pid]) continue;
    const amount = roundSpMoney(parseSpMoney(p?.amount));
    if (amount <= 0) continue;
    try {
      const body = mapPaymentToQbo(p, custId, invoiceQboId, amount);
      const created = await qboRequest(ownerEmail, "POST", "/payment", body);
      const qboPayId = String(created?.Payment?.Id || "");
      if (!qboPayId) throw new Error("No Payment Id returned from QuickBooks.");
      refs[pid] = qboPayId;
      changed = true;
      await writeLog({
        ownerEmail,
        entityType: "payment",
        localId: `${localId}:${pid}`,
        quickBooksId: qboPayId,
        action: "create",
        status: "success",
        message: "Payment synced",
      });
    } catch (err) {
      await writeLog({
        ownerEmail,
        entityType: "payment",
        localId: `${localId}:${pid}`,
        quickBooksId: "",
        action: "create",
        status: "error",
        message: err.message || "Payment sync failed",
      });
    }
  }

  if (changed) {
    await SimpleServiceProposal.updateOne(
      { _id: localId, createdByEmail: String(ownerEmail).toLowerCase() },
      { $set: { quickbooksPaymentRefs: refs } }
    );
  }
}

/**
 * @param {string} ownerEmail
 * @param {object} poDoc
 */
export async function syncPurchaseOrderToQbo(ownerEmail, poDoc) {
  const localId = String(poDoc?._id || poDoc?.id || "");
  const settings = await loadShopSettings(ownerEmail);
  const expenseAccountId = String(settings.quickBooksDefaultExpenseAccountId || "").trim();
  if (!expenseAccountId) {
    throw new Error("Select a default expense account in Settings → Accounts → QuickBooks.");
  }
  let action = "create";
  let qboId = "";
  try {
    let vendorQboId = "";
    const vendorId = String(poDoc?.vendorId || "").trim();
    if (vendorId) {
      const vendor = await Vendor.findOne({
        _id: vendorId,
        createdByEmail: String(ownerEmail).toLowerCase(),
      }).lean();
      if (vendor) {
        vendorQboId =
          vendor.sourceSystem === QBO_SOURCE_SYSTEM && vendor.externalRef
            ? String(vendor.externalRef)
            : await syncVendorToQbo(ownerEmail, vendor);
      }
    }
    if (!vendorQboId) {
      throw new Error("Vendor required to sync purchase order to QuickBooks.");
    }

    const existingRef =
      poDoc?.sourceSystem === QBO_SOURCE_SYSTEM && poDoc?.externalRef
        ? String(poDoc.externalRef)
        : "";
    let existing = null;
    if (existingRef) {
      try {
        const cur = await qboRequest(ownerEmail, "GET", `/bill/${existingRef}`);
        existing = cur?.Bill || null;
      } catch {
        existing = null;
      }
    }
    const body = mapBillToQbo(poDoc, vendorQboId, expenseAccountId, existing);
    if (existing?.Id) {
      action = "update";
      const updated = await qboRequest(ownerEmail, "POST", "/bill", body);
      qboId = String(updated?.Bill?.Id || existing.Id);
    } else {
      const created = await qboRequest(ownerEmail, "POST", "/bill", body);
      qboId = String(created?.Bill?.Id || "");
    }
    if (!qboId) throw new Error("No Bill Id returned from QuickBooks.");
    await SimplePurchaseOrder.updateOne(
      { _id: localId, createdByEmail: String(ownerEmail).toLowerCase() },
      { $set: { sourceSystem: QBO_SOURCE_SYSTEM, externalRef: qboId } }
    );
    await writeLog({
      ownerEmail,
      entityType: "vendorPo",
      localId,
      quickBooksId: qboId,
      action,
      status: "success",
      message: "Vendor PO synced as Bill",
    });

    const payStatus = String(poDoc?.paymentStatus || "").trim().toLowerCase();
    if (payStatus === "paid") {
      await syncPoPaymentsToQbo(
        ownerEmail,
        { ...poDoc, externalRef: qboId, sourceSystem: QBO_SOURCE_SYSTEM },
        vendorQboId
      );
    }
    return qboId;
  } catch (err) {
    await writeLog({
      ownerEmail,
      entityType: "vendorPo",
      localId,
      quickBooksId: qboId,
      action,
      status: "error",
      message: err.message || "Vendor PO sync failed",
    });
    throw err;
  }
}

async function syncPoPaymentsToQbo(ownerEmail, poDoc, vendorQboId) {
  const localId = String(poDoc?._id || poDoc?.id || "");
  const billQboId =
    poDoc?.sourceSystem === QBO_SOURCE_SYSTEM && poDoc?.externalRef
      ? String(poDoc.externalRef)
      : "";
  if (!billQboId) return;
  const refs =
    poDoc?.quickbooksPaymentRefs && typeof poDoc.quickbooksPaymentRefs === "object"
      ? { ...poDoc.quickbooksPaymentRefs }
      : {};
  const payments = Array.isArray(poDoc?.payments) ? poDoc.payments : [];
  const bankId = await findBankAccountId(ownerEmail);
  let changed = false;

  for (const p of payments) {
    const pid = String(p?.id || "").trim();
    if (!pid || refs[pid]) continue;
    const amount = roundPoMoney(parsePoMoney(p?.amount));
    if (amount <= 0) continue;
    try {
      const body = mapBillPaymentToQbo(p, vendorQboId, billQboId, amount, bankId || undefined);
      const created = await qboRequest(ownerEmail, "POST", "/billpayment", body);
      const qboPayId = String(created?.BillPayment?.Id || "");
      if (!qboPayId) throw new Error("No BillPayment Id returned.");
      refs[pid] = qboPayId;
      changed = true;
      await writeLog({
        ownerEmail,
        entityType: "payment",
        localId: `po:${localId}:${pid}`,
        quickBooksId: qboPayId,
        action: "create",
        status: "success",
        message: "Bill payment synced",
      });
    } catch (err) {
      await writeLog({
        ownerEmail,
        entityType: "payment",
        localId: `po:${localId}:${pid}`,
        quickBooksId: "",
        action: "create",
        status: "error",
        message: err.message || "Bill payment sync failed",
      });
    }
  }
  if (changed) {
    await SimplePurchaseOrder.updateOne(
      { _id: localId, createdByEmail: String(ownerEmail).toLowerCase() },
      { $set: { quickbooksPaymentRefs: refs } }
    );
  }
}

/**
 * When a JOB enters a configured closed status: sync customer + linked POs.
 * Invoice sync waits until recordType is INVOICE (separate trigger).
 * @param {string} ownerEmail
 * @param {object} jobDoc
 */
export async function syncJobClosedBundle(ownerEmail, jobDoc) {
  const customerId = String(jobDoc?.customerId || "").trim();
  if (customerId) {
    const customer = await Customer.findOne({
      _id: customerId,
      createdByEmail: String(ownerEmail).toLowerCase(),
    }).lean();
    if (customer) await syncCustomerToQbo(ownerEmail, customer);
  }

  const spId = String(jobDoc?._id || jobDoc?.id || "");
  if (String(jobDoc?.recordType || "").toUpperCase() === "INVOICE") {
    await syncInvoiceToQbo(ownerEmail, jobDoc);
  }

  const pos = await SimplePurchaseOrder.find({
    createdByEmail: String(ownerEmail).toLowerCase(),
    serviceProposalId: spId,
  }).lean();
  for (const po of pos) {
    try {
      await syncPurchaseOrderToQbo(ownerEmail, po);
    } catch (err) {
      console.error("QBO PO sync on job close:", err);
    }
  }
}

/**
 * Manual retry: re-sync recent error entities + optionally push pending invoices/POs.
 * @param {string} ownerEmail
 */
export async function syncNowForShop(ownerEmail) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  if (!(await isQuickBooksSyncActive(email))) {
    throw new Error("QuickBooks sync is not enabled or not connected.");
  }
  await connectDB();
  const recentErrors = await QuickBooksSyncLog.find({
    ownerEmail: email,
    status: "error",
  })
    .sort({ occurredAt: -1 })
    .limit(20)
    .lean();

  const tried = new Set();
  let synced = 0;
  let failed = 0;

  for (const log of recentErrors) {
    const key = `${log.entityType}:${log.localId}`;
    if (tried.has(key)) continue;
    tried.add(key);
    try {
      if (log.entityType === "customer") {
        const doc = await Customer.findOne({ _id: log.localId, createdByEmail: email }).lean();
        if (doc) {
          await syncCustomerToQbo(email, doc);
          synced += 1;
        }
      } else if (log.entityType === "vendor") {
        const doc = await Vendor.findOne({ _id: log.localId, createdByEmail: email }).lean();
        if (doc) {
          await syncVendorToQbo(email, doc);
          synced += 1;
        }
      } else if (log.entityType === "invoice") {
        const doc = await SimpleServiceProposal.findOne({
          _id: log.localId,
          createdByEmail: email,
        }).lean();
        if (doc) {
          await syncInvoiceToQbo(email, doc);
          synced += 1;
        }
      } else if (log.entityType === "vendorPo") {
        const doc = await SimplePurchaseOrder.findOne({
          _id: log.localId,
          createdByEmail: email,
        }).lean();
        if (doc) {
          await syncPurchaseOrderToQbo(email, doc);
          synced += 1;
        }
      } else if (log.entityType === "payment") {
        const localId = String(log.localId || "");
        if (localId.startsWith("po:")) {
          const poId = localId.split(":")[1];
          const doc = await SimplePurchaseOrder.findOne({ _id: poId, createdByEmail: email }).lean();
          if (doc) {
            await syncPurchaseOrderToQbo(email, doc);
            synced += 1;
          }
        } else {
          const invId = localId.split(":")[0];
          const doc = await SimpleServiceProposal.findOne({
            _id: invId,
            createdByEmail: email,
          }).lean();
          if (doc) {
            await syncInvoiceToQbo(email, doc);
            synced += 1;
          }
        }
      }
    } catch {
      failed += 1;
    }
  }

  return { synced, failed, attempted: tried.size };
}
