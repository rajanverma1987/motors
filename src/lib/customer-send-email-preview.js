import { connectDB } from "@/lib/db";
import Quote from "@/models/Quote";
import Invoice from "@/models/Invoice";
import PurchaseOrder from "@/models/PurchaseOrder";
import Customer from "@/models/Customer";
import Vendor from "@/models/Vendor";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { getWorkspaceSmtpDeliveryNotice } from "@/lib/workspace-smtp-fields";
import { resolveOutboundFromPreview } from "@/lib/customer-facing-email-content";

function shopCompanyNameFromUser(user) {
  return (user.shopName && String(user.shopName).trim()) || process.env.MOTOR_SHOP_COMPANY_NAME?.trim() || "";
}

function buildSendMetaPreview({ uSettings, shopCompanyName, toEmail, toName, documentLabel }) {
  return {
    toEmail,
    toName,
    from: resolveOutboundFromPreview(uSettings, shopCompanyName),
    documentLabel,
    smtp: getWorkspaceSmtpDeliveryNotice(uSettings),
  };
}

/**
 * @param {{ quoteId: string, user: object }} opts
 */
export async function buildQuoteSendEmailPreview({ quoteId, user }) {
  await connectDB();
  const email = user.email.trim().toLowerCase();
  const doc = await Quote.findOne({ _id: quoteId, createdByEmail: email });
  if (!doc) return { ok: false, status: 404, error: "Quote not found" };

  const customer = await Customer.findOne({ _id: doc.customerId, createdByEmail: email }).lean();
  const toEmail = customer?.email?.trim();
  if (!toEmail) {
    return {
      ok: false,
      status: 400,
      error: "Customer has no email address. Add an email to the customer record.",
    };
  }

  const shopCompanyName = shopCompanyNameFromUser(user);
  const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
  const uSettings = mergeUserSettings(settingsDoc?.settings);

  return {
    ok: true,
    preview: buildSendMetaPreview({
      uSettings,
      shopCompanyName,
      toEmail,
      toName: customer.primaryContactName || customer.companyName || "",
      documentLabel: doc.rfqNumber ? `RFQ# ${doc.rfqNumber}` : "Quote",
    }),
  };
}

/**
 * @param {{ invoiceId: string, user: object }} opts
 */
export async function buildInvoiceSendEmailPreview({ invoiceId, user }) {
  await connectDB();
  const email = user.email.trim().toLowerCase();
  const inv = await Invoice.findOne({ _id: invoiceId, createdByEmail: email });
  if (!inv) return { ok: false, status: 404, error: "Invoice not found" };

  const customer = await Customer.findOne({ _id: inv.customerId, createdByEmail: email }).lean();
  const toEmail = customer?.email?.trim();
  if (!toEmail) {
    return {
      ok: false,
      status: 400,
      error: "Customer has no email address. Add an email to the customer record.",
    };
  }

  const shopCompanyName = shopCompanyNameFromUser(user);
  const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
  const uSettings = mergeUserSettings(settingsDoc?.settings);

  return {
    ok: true,
    preview: buildSendMetaPreview({
      uSettings,
      shopCompanyName,
      toEmail,
      toName: customer.primaryContactName || customer.companyName || "",
      documentLabel: inv.invoiceNumber ? `Invoice #${inv.invoiceNumber}` : "Invoice",
    }),
  };
}

/**
 * @param {{ poId: string, user: object }} opts
 */
export async function buildPoSendEmailPreview({ poId, user }) {
  await connectDB();
  const email = user.email.trim().toLowerCase();
  const doc = await PurchaseOrder.findOne({ _id: poId, createdByEmail: email });
  if (!doc) return { ok: false, status: 404, error: "Purchase order not found" };

  const vendor = await Vendor.findOne({ _id: doc.vendorId, createdByEmail: email }).lean();
  const toEmail = vendor?.email?.trim();
  if (!toEmail) {
    return {
      ok: false,
      status: 400,
      error: "Vendor has no email address. Add an email to the vendor record.",
    };
  }

  const shopCompanyName = shopCompanyNameFromUser(user);
  const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
  const uSettings = mergeUserSettings(settingsDoc?.settings);

  return {
    ok: true,
    preview: buildSendMetaPreview({
      uSettings,
      shopCompanyName,
      toEmail,
      toName: vendor.name || vendor.contactName || "",
      documentLabel: doc.poNumber ? `PO# ${doc.poNumber}` : "Purchase order",
    }),
  };
}
