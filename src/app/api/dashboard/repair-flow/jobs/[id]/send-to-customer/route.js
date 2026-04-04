import { NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import MotorRepairJob from "@/models/MotorRepairJob";
import Customer from "@/models/Customer";
import Quote from "@/models/Quote";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { buildCustomerQuoteInvoiceEmailBlock, accountsPaymentTermsLabel } from "@/lib/accounts-display";
import { sendRepairFlowPreliminaryToCustomer } from "@/lib/email";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { sendCrmQuoteToCustomer } from "@/lib/crm-quote-send-customer";

function getParams(context) {
  return typeof context.params?.then === "function" ? context.params : Promise.resolve(context.params || {});
}

export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
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

    const customer = await Customer.findOne({ _id: job.customerId, createdByEmail: email }).lean();
    const toEmail = customer?.email?.trim();
    if (!toEmail) {
      return NextResponse.json(
        { error: "Customer has no email address. Add an email to the customer record." },
        { status: 400 }
      );
    }

    const shopCompanyName =
      (user.shopName && String(user.shopName).trim()) ||
      process.env.MOTOR_SHOP_COMPANY_NAME?.trim() ||
      "";
    const baseUrl = getPublicSiteUrl(request);
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const uSettings = mergeUserSettings(settingsDoc?.settings);
    const logoPath = typeof uSettings.logoUrl === "string" ? uSettings.logoUrl.trim() : "";
    const logoAbsoluteUrl =
      logoPath.startsWith("/uploads/shop-settings/") && baseUrl
        ? `${baseUrl.replace(/\/$/, "")}${logoPath}`
        : "";
    const accountsEmailBlock = buildCustomerQuoteInvoiceEmailBlock({
      billingAddress: uSettings.accountsBillingAddress,
      paymentTermsLabel: accountsPaymentTermsLabel(uSettings.accountsPaymentTerms),
    });
    const emailExtras = {
      ...(logoAbsoluteUrl ? { logoAbsoluteUrl } : {}),
      ...(accountsEmailBlock.trim() ? { accountsEmailBlock } : {}),
    };

    if (job.phase === "awaiting_final_approval") {
      const fid = String(job.finalFlowQuoteId || "").trim();
      if (!mongoose.isValidObjectId(fid)) {
        return NextResponse.json({ error: "Final quote is not set." }, { status: 400 });
      }
      let crmQuote = await Quote.findOne({
        _id: fid,
        createdByEmail: email,
      }).select({ _id: 1 });
      if (!crmQuote) {
        crmQuote = await Quote.findOne({
          createdByEmail: email,
          motorRepairFlowQuoteId: fid,
        }).select({ _id: 1 });
      }
      if (!crmQuote) {
        return NextResponse.json(
          {
            error:
              "No RFQ found for this job’s primary final quote. Open the Quotes page and ensure the repair job is linked.",
          },
          { status: 400 }
        );
      }
      const result = await sendCrmQuoteToCustomer({
        quoteId: crmQuote._id.toString(),
        user,
        request,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status || 500 });
      }
      return NextResponse.json({
        ok: true,
        message: result.message,
        mode: "final",
      });
    }

    if (job.phase === "awaiting_preliminary_approval") {
      const pid = String(job.preliminaryFlowQuoteId || "").trim();
      if (!mongoose.isValidObjectId(pid)) {
        return NextResponse.json({ error: "Preliminary flow quote is not set." }, { status: 400 });
      }
      if (!job.preliminaryRespondToken || !job.preliminaryRespondToken.trim()) {
        job.preliminaryRespondToken = crypto.randomBytes(24).toString("hex");
        await job.save();
      }
      const respondUrl = `${baseUrl.replace(/\/$/, "")}/repair-flow/preliminary/${job.preliminaryRespondToken}`;
      const emailResult = await sendRepairFlowPreliminaryToCustomer(
        toEmail,
        customer.primaryContactName || customer.companyName,
        job.jobNumber,
        respondUrl,
        shopCompanyName,
        emailExtras
      );
      if (!emailResult.ok) {
        return NextResponse.json(
          { error: emailResult.error || "Failed to send email" },
          { status: 500 }
        );
      }
      return NextResponse.json({
        ok: true,
        message: "Preliminary quote link sent to customer.",
        mode: "preliminary",
      });
    }

    return NextResponse.json(
      {
        error:
          "Send to customer is only available when the job is waiting for preliminary or final quote approval.",
      },
      { status: 400 }
    );
  } catch (err) {
    console.error("repair-flow send-to-customer:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
