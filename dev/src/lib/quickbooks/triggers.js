import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { getActiveConnection } from "@/lib/quickbooks/client";
import { didEnterQuickBooksJobClosedStatus } from "@/lib/quickbooks/job-closed-status";
import {
  syncCustomerToQbo,
  syncInvoiceToQbo,
  syncJobClosedBundle,
  syncPurchaseOrderToQbo,
} from "@/lib/quickbooks/sync";

/**
 * @param {string} ownerEmail
 */
async function loadMergedSettings(ownerEmail) {
  await connectDB();
  const email = String(ownerEmail || "").trim().toLowerCase();
  const doc = await UserSettings.findOne({ ownerEmail: email }).lean();
  return mergeUserSettings(doc?.settings);
}

/**
 * @param {string} ownerEmail
 */
async function canSync(ownerEmail) {
  const settings = await loadMergedSettings(ownerEmail);
  if (!settings.quickBooksEnabled) return { ok: false, settings };
  const conn = await getActiveConnection(ownerEmail);
  if (!conn) return { ok: false, settings };
  return { ok: true, settings };
}

function paymentsFingerprint(payments) {
  const list = Array.isArray(payments) ? payments : [];
  return JSON.stringify(
    list.map((p) => ({
      id: p?.id,
      amount: p?.amount,
      date: p?.date,
      method: p?.method,
      reference: p?.reference,
    }))
  );
}

/**
 * Fire-and-forget entry for dashboard API routes.
 * @param {{ ownerEmail: string, trigger: string, previous?: object|null, next?: object|null, customer?: object|null }} args
 */
export function enqueueQuickBooksSync(args) {
  void runQuickBooksSync(args).catch((err) => {
    console.error("QuickBooks sync enqueue error:", err);
  });
}

/**
 * @param {{ ownerEmail: string, trigger: string, previous?: object|null, next?: object|null, customer?: object|null }} args
 */
export async function runQuickBooksSync(args) {
  const ownerEmail = String(args?.ownerEmail || "").trim().toLowerCase();
  if (!ownerEmail) return;
  const gate = await canSync(ownerEmail);
  if (!gate.ok) return;

  const trigger = String(args?.trigger || "").trim();
  const previous = args?.previous || null;
  const next = args?.next || null;
  const closedStatuses = gate.settings.quickBooksJobClosedStatuses || [];

  try {
    if (trigger === "customer" && args?.customer) {
      await syncCustomerToQbo(ownerEmail, args.customer);
      return;
    }

    if (trigger === "serviceProposal" && next) {
      const recordType = String(next.recordType || "").toUpperCase();
      const prevStatus = String(previous?.jobStatus || "").trim();
      const nextStatus = String(next.jobStatus || "").trim();

      if (
        (recordType === "JOB" || recordType === "INVOICE") &&
        didEnterQuickBooksJobClosedStatus(prevStatus, nextStatus, closedStatuses)
      ) {
        await syncJobClosedBundle(ownerEmail, next);
        return;
      }

      if (recordType === "INVOICE") {
        const paymentsChanged =
          !previous || paymentsFingerprint(previous.payments) !== paymentsFingerprint(next.payments);
        await syncInvoiceToQbo(ownerEmail, next);
        if (paymentsChanged) {
          /* payments handled inside syncInvoiceToQbo */
        }
        return;
      }
      return;
    }

    if (trigger === "purchaseOrder" && next) {
      await syncPurchaseOrderToQbo(ownerEmail, next);
    }
  } catch (err) {
    console.error("QuickBooks sync run error:", err);
  }
}
