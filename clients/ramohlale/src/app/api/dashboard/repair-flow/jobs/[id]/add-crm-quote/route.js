import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import MotorRepairJob from "@/models/MotorRepairJob";
import Quote from "@/models/Quote";
import Customer from "@/models/Customer";
import { getNextRfqNumber } from "@/lib/dashboard-quote-rfq";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import {
  todayQuoteDateString,
  defaultPreparedByEmployeeIdForPortalUser,
} from "@/lib/quote-defaults-shop";
import { normalizeTaxExempt, normalizeTaxPercent } from "@/lib/quote-invoice-totals";

/** Attach another draft RFQ (Quote) to this repair job — same collection as the Quotes tab. */
export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid job" }, { status: 400 });
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const job = await MotorRepairJob.findOne({ _id: id, createdByEmail: email });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const customerId = String(job.customerId || "").trim();
    const motorId = String(job.motorId || "").trim();
    if (!customerId || !motorId || !mongoose.isValidObjectId(customerId) || !mongoose.isValidObjectId(motorId)) {
      return NextResponse.json(
        { error: "Assign a customer and motor on this job before adding an RFQ." },
        { status: 400 }
      );
    }

    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const merged = mergeUserSettings(settingsDoc?.settings);
    const rfqNumber = await getNextRfqNumber(email, merged);
    const quoteDate = todayQuoteDateString();
    const preparedByEmpId = await defaultPreparedByEmployeeIdForPortalUser(email, user.email);
    const customer = await Customer.findOne({ _id: customerId, createdByEmail: email })
      .select("taxExempt taxPercent")
      .lean();

    const crmQuote = await Quote.create({
      customerId,
      motorId,
      leadId: "",
      status: "draft",
      date: quoteDate,
      preparedBy: preparedByEmpId,
      rfqNumber,
      repairFlowJobId: String(id),
      motorRepairFlowQuoteId: "",
      repairScope: "",
      laborTotal: "",
      partsTotal: "",
      customerTaxExempt: normalizeTaxExempt(customer?.taxExempt),
      customerTaxPercent: String(normalizeTaxPercent(customer?.taxPercent)),
      scopeLines: [],
      partsLines: [],
      estimatedCompletion: "",
      customerNotes: "",
      notes: "",
      createdByEmail: email,
    });

    return NextResponse.json({
      ok: true,
      quote: {
        id: crmQuote._id.toString(),
        rfqNumber: crmQuote.rfqNumber,
      },
    });
  } catch (err) {
    console.error("add-crm-quote:", err);
    return NextResponse.json({ error: err.message || "Failed to add quote" }, { status: 500 });
  }
}
