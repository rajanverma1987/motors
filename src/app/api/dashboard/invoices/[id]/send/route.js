import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import UserSettings from "@/models/UserSettings";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { sendInvoiceToCustomer } from "@/lib/email";
import { mergeUserSettings } from "@/lib/user-settings";
import { buildCustomerQuoteInvoiceEmailBlock, accountsPaymentTermsLabel } from "@/lib/accounts-display";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const email = user.email.trim().toLowerCase();
    await connectDB();
    const inv = await Invoice.findOne({ _id: id, createdByEmail: email });
    if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const customer = await Customer.findOne({ _id: inv.customerId, createdByEmail: email }).lean();
    const toEmail = customer?.email?.trim();
    if (!toEmail) {
      return NextResponse.json(
        { error: "Customer has no email address. Add an email to the customer record." },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (request.headers.get("x-forwarded-proto") && request.headers.get("host")
        ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("host")}`
        : "") ||
      "";
    const shopCompanyName =
      (user.shopName && String(user.shopName).trim()) ||
      process.env.MOTOR_SHOP_COMPANY_NAME?.trim() ||
      "";
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const uSettings = mergeUserSettings(settingsDoc?.settings);
    const logoPath = typeof uSettings.logoUrl === "string" ? uSettings.logoUrl.trim() : "";
    const logoAbsoluteUrl =
      logoPath.startsWith("/uploads/shop-settings/") && baseUrl
        ? `${baseUrl.replace(/\/$/, "")}${logoPath}`
        : "";

    if (!inv.customerViewToken?.trim()) {
      let token = crypto.randomBytes(24).toString("hex");
      for (let attempt = 0; attempt < 5; attempt++) {
        inv.customerViewToken = token;
        try {
          await inv.save();
          break;
        } catch (e) {
          if (e?.code === 11000) token = crypto.randomBytes(24).toString("hex");
          else throw e;
        }
      }
    }

    let siteBase = baseUrl.replace(/\/$/, "");
    if (!siteBase) {
      try {
        siteBase = new URL(request.url).origin;
      } catch {
        /* ignore */
      }
    }
    const viewUrl = `${siteBase}/invoice/view/${inv.customerViewToken}`;

    const accountsEmailBlock = buildCustomerQuoteInvoiceEmailBlock({
      billingAddress: uSettings.accountsBillingAddress,
      paymentTermsLabel: accountsPaymentTermsLabel(uSettings.accountsPaymentTerms),
    });

    const result = await sendInvoiceToCustomer(
      toEmail,
      customer.primaryContactName || customer.companyName,
      inv.invoiceNumber || inv.rfqNumber,
      shopCompanyName,
      {
        logoAbsoluteUrl,
        accountsEmailBlock,
        viewUrl,
      }
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Email failed" }, { status: 502 });
    }
    inv.status = "sent";
    await inv.save();
    return NextResponse.json({ ok: true, message: "Invoice sent to customer." });
  } catch (err) {
    console.error("Invoice send:", err);
    return NextResponse.json({ error: err.message || "Failed to send" }, { status: 500 });
  }
}
