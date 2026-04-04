import crypto from "crypto";
import { connectDB } from "@/lib/db";
import Quote from "@/models/Quote";
import Customer from "@/models/Customer";
import { sendQuoteToCustomer } from "@/lib/email";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { buildCustomerQuoteInvoiceEmailBlock, accountsPaymentTermsLabel } from "@/lib/accounts-display";

/**
 * Send CRM Quote email with approve/reject link; sets status to sent when successful.
 * @param {{ quoteId: string, user: { email?: string, shopName?: string, contactName?: string }, request: Request }} opts
 * @returns {Promise<{ ok: true, message: string, quote: object } | { ok: false, status?: number, error: string }>}
 */
export async function sendCrmQuoteToCustomer({ quoteId, user, request }) {
  await connectDB();
  const doc = await Quote.findOne({
    _id: quoteId,
    createdByEmail: user.email.trim().toLowerCase(),
  });
  if (!doc) {
    return { ok: false, status: 404, error: "Quote not found" };
  }

  const customer = await Customer.findOne({
    _id: doc.customerId,
    createdByEmail: user.email.trim().toLowerCase(),
  }).lean();
  const toEmail = customer?.email?.trim();
  if (!toEmail) {
    return {
      ok: false,
      status: 400,
      error: "Customer has no email address. Add an email to the customer record.",
    };
  }

  if (!doc.respondToken || !doc.respondToken.trim()) {
    doc.respondToken = crypto.randomBytes(24).toString("hex");
    await doc.save();
  }

  const baseUrl = getPublicSiteUrl(request);
  const respondUrl = `${baseUrl.replace(/\/$/, "")}/quote/respond/${doc.respondToken}`;
  const shopCompanyName =
    (user.shopName && String(user.shopName).trim()) ||
    process.env.MOTOR_SHOP_COMPANY_NAME?.trim() ||
    "";

  const settingsDoc = await UserSettings.findOne({ ownerEmail: user.email.trim().toLowerCase() }).lean();
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

  const emailResult = await sendQuoteToCustomer(
    toEmail,
    customer.primaryContactName || customer.companyName,
    doc.rfqNumber,
    respondUrl,
    shopCompanyName,
    {
      ...(logoAbsoluteUrl ? { logoAbsoluteUrl } : {}),
      ...(accountsEmailBlock.trim() ? { accountsEmailBlock } : {}),
    }
  );
  if (!emailResult.ok) {
    return { ok: false, status: 500, error: emailResult.error || "Failed to send email" };
  }

  const previousStatus = doc.status || "draft";
  if (previousStatus !== "sent") {
    if (!Array.isArray(doc.statusLog)) doc.statusLog = [];
    doc.statusLog.push({
      from: previousStatus,
      to: "sent",
      at: new Date(),
      by:
        (user.contactName && user.contactName.trim()) ||
        (user.shopName && user.shopName.trim()) ||
        user.email?.trim() ||
        "",
    });
    doc.markModified("statusLog");
  }
  doc.status = "sent";
  await doc.save();

  return {
    ok: true,
    message: "Quote sent to customer. Status set to Sent.",
    quote: {
      ...doc.toObject(),
      id: doc._id.toString(),
      _id: undefined,
    },
  };
}
