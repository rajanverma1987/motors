import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import User from "@/models/User";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { buildSimplePortalPayload } from "@/lib/simple-customer-portal";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

/**
 * GET /api/portal/[token]
 * Public. Returns customer name + Simple service proposals / invoices for the customer portal.
 */
export async function GET(request, context) {
  try {
    const params = await getParams(context);
    const token = params?.token?.trim();
    if (!token) {
      return NextResponse.json({ error: "Invalid link" }, { status: 400 });
    }
    await connectDB();
    const customer = await Customer.findOne({ portalToken: token }).lean();
    if (!customer) {
      return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });
    }
    const customerId = customer._id.toString();
    const ownerEmail = String(customer.createdByEmail || "").trim().toLowerCase();

    const [settingsDoc, shopUser, proposals] = await Promise.all([
      ownerEmail ? UserSettings.findOne({ ownerEmail }).lean() : Promise.resolve(null),
      ownerEmail
        ? User.findOne({ email: ownerEmail }).select("shopName contactName email").lean()
        : Promise.resolve(null),
      ownerEmail
        ? SimpleServiceProposal.find({ createdByEmail: ownerEmail, customerId })
            .sort({ updatedAt: -1 })
            .limit(500)
            .lean()
        : Promise.resolve([]),
    ]);

    const merged = mergeUserSettings(settingsDoc?.settings);
    const currency = String(merged?.currency || "USD").toUpperCase().trim() || "USD";
    const logoUrl = String(merged?.logoUrl || "").trim();

    const customerName =
      [customer.primaryContactName, customer.companyName].filter(Boolean).join(" – ") ||
      customer.companyName ||
      "Customer";

    const printUser = shopUser
      ? {
          shopName: String(shopUser.shopName || "").trim(),
          contactName: String(shopUser.contactName || "").trim(),
          email: String(shopUser.email || ownerEmail).trim(),
        }
      : { shopName: "", contactName: "", email: ownerEmail };

    const payload = buildSimplePortalPayload(proposals, {
      customer,
      accountSettings: merged,
      user: printUser,
      employees: [],
    });

    return NextResponse.json({
      customer: {
        name: customerName,
        companyName: customer.companyName ?? "",
      },
      shop: {
        currency,
        logoUrl,
        logoDocumentScale: merged.logoDocumentScale,
        accountsBillingAddress: String(merged?.accountsBillingAddress || "").trim(),
        accountsShippingAddress: String(merged?.accountsShippingAddress || "").trim(),
        accountsPaymentTerms: String(merged?.accountsPaymentTerms || "").trim(),
        invoicePaymentOptions: String(merged?.invoicePaymentOptions || "").trim(),
        invoiceThankYouNote: String(merged?.invoiceThankYouNote || "").trim(),
        shopName: printUser.shopName,
      },
      ...payload,
    });
  } catch (err) {
    console.error("Portal view error:", err);
    return NextResponse.json({ error: "Failed to load portal" }, { status: 500 });
  }
}
