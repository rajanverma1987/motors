import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import Quote from "@/models/Quote";
import Motor from "@/models/Motor";
import Customer from "@/models/Customer";
import WorkOrder from "@/models/WorkOrder";
import UserSettings from "@/models/UserSettings";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import {
  createWorkOrderForQuote,
  resolvedClosedWorkOrderStatus,
} from "@/lib/work-order-factory";

const BACKFILL_NOTE =
  "Backfilled: work order created for an invoiced quote that did not yet have a work order.";

/**
 * POST — one-time / admin: create a closed work order for each invoice’s quote when no WO exists yet.
 * Body: `{ "dryRun": true }` to preview only (no writes).
 */
export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const dryRun = Boolean(body?.dryRun);

    await connectDB();
    const [invoices, settingsDoc] = await Promise.all([
      Invoice.find({ createdByEmail: email }).select("_id quoteId invoiceNumber").lean(),
      UserSettings.findOne({ ownerEmail: email }).lean(),
    ]);

    const closedStatus = resolvedClosedWorkOrderStatus(settingsDoc);
    const created = [];
    const preview = [];
    const skipped = [];
    const errors = [];

    for (const inv of invoices) {
      const quoteId = String(inv.quoteId || "").trim();
      const invoiceId = inv._id?.toString?.() || String(inv._id);
      if (!mongoose.isValidObjectId(quoteId)) {
        skipped.push({ invoiceId, quoteId, reason: "invalid_quote_id" });
        continue;
      }

      const existing = await WorkOrder.findOne({ createdByEmail: email, quoteId }).select("_id").lean();
      if (existing) {
        skipped.push({
          invoiceId,
          quoteId,
          reason: "work_order_already_exists",
          workOrderId: String(existing._id),
        });
        continue;
      }

      const quote = await Quote.findOne({ _id: quoteId, createdByEmail: email }).lean();
      if (!quote) {
        skipped.push({ invoiceId, quoteId, reason: "quote_not_found" });
        continue;
      }

      if (dryRun) {
        preview.push({
          invoiceId,
          quoteId,
          rfqNumber: String(quote.rfqNumber || "").trim(),
          wouldSetStatus: closedStatus,
        });
        continue;
      }

      const motor = await Motor.findOne({
        _id: quote.motorId,
        createdByEmail: email,
      }).lean();
      if (!motor) {
        errors.push({ invoiceId, quoteId, error: "Motor not found for quote" });
        continue;
      }
      const customer = await Customer.findOne({
        _id: quote.customerId,
        createdByEmail: email,
      }).lean();
      if (!customer) {
        errors.push({ invoiceId, quoteId, error: "Customer not found for quote" });
        continue;
      }

      const result = await createWorkOrderForQuote({
        email,
        quote,
        motor,
        customer,
        settingsDoc,
        options: {
          skipQuoteApprovalCheck: true,
          forcedStatus: closedStatus,
          reserveInventory: false,
          notifyBoard: false,
          notifyAssignee: false,
          notes: BACKFILL_NOTE,
        },
      });

      if (!result.ok) {
        errors.push({ invoiceId, quoteId, error: result.error });
        continue;
      }

      created.push({
        invoiceId,
        quoteId,
        workOrderId: result.workOrder.id,
        workOrderNumber: result.workOrder.workOrderNumber,
        status: result.workOrder.status,
      });
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      closedStatusUsed: closedStatus,
      invoiceCount: invoices.length,
      ...(dryRun
        ? { previewCount: preview.length, preview }
        : { createdCount: created.length, created }),
      skippedCount: skipped.length,
      errorCount: errors.length,
      skipped,
      errors,
    });
  } catch (err) {
    console.error("work-orders backfill-from-invoices:", err);
    return NextResponse.json({ error: err.message || "Backfill failed" }, { status: 500 });
  }
}
