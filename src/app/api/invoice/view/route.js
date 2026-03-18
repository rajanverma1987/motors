import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import User from "@/models/User";
import UserSettings from "@/models/UserSettings";
import Customer from "@/models/Customer";
import Motor from "@/models/Motor";
import { mergeUserSettings } from "@/lib/user-settings";
import { accountsPaymentTermsLabel } from "@/lib/accounts-display";
import { resolvePreparedByDisplay } from "@/lib/prepared-by-display";
import { customerInvoiceToBlock } from "@/lib/customer-invoice-address";

/** Public GET ?token= — invoice for customer view/print (no internal notes). */
export async function GET(request) {
  try {
    const token = request.nextUrl.searchParams.get("token")?.trim();
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Invoice.findOne({ customerViewToken: token }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Invoice not found or link invalid" }, { status: 404 });
    }
    const ownerEmail = String(doc.createdByEmail || "")
      .trim()
      .toLowerCase();
    const owner = ownerEmail ? await User.findOne({ email: ownerEmail }).lean() : null;
    const settingsDoc = ownerEmail
      ? await UserSettings.findOne({ ownerEmail }).lean()
      : null;
    const u = mergeUserSettings(settingsDoc?.settings);

    let customerToName = "";
    let customerBillingAddress = "";
    let motorLabel = "";
    if (doc.customerId) {
      const cust = await Customer.findOne({
        _id: doc.customerId,
        createdByEmail: ownerEmail,
      }).lean();
      if (cust) {
        const block = customerInvoiceToBlock(cust);
        customerToName = block.toName;
        customerBillingAddress = block.billingAddress;
      }
    }
    if (doc.motorId) {
      const motor = await Motor.findOne({
        _id: doc.motorId,
        createdByEmail: ownerEmail,
      }).lean();
      if (motor) {
        motorLabel =
          [motor.serialNumber, motor.manufacturer, motor.model].filter(Boolean).join(" · ") || "";
      }
    }

    const preparedBy = await resolvePreparedByDisplay(doc.preparedBy, ownerEmail);

    return NextResponse.json({
      invoiceNumber: doc.invoiceNumber ?? "",
      rfqNumber: doc.rfqNumber ?? "",
      customerPo: doc.customerPo ?? "",
      date: doc.date ?? "",
      preparedBy,
      status: doc.status ?? "draft",
      scopeLines: Array.isArray(doc.scopeLines) ? doc.scopeLines : [],
      partsLines: Array.isArray(doc.partsLines) ? doc.partsLines : [],
      laborTotal: doc.laborTotal ?? "",
      partsTotal: doc.partsTotal ?? "",
      customerNotes: doc.customerNotes ?? "",
      motorLabel,
      fromShopName: owner?.shopName?.trim() || "",
      fromShopContact: [owner?.contactName, owner?.email].filter(Boolean).join(" · ") || "",
      fromBillingAddress: (u.accountsBillingAddress || "").trim(),
      fromPaymentTermsLabel: accountsPaymentTermsLabel(u.accountsPaymentTerms),
      customerToName,
      customerBillingAddress,
      currency: typeof u.currency === "string" ? u.currency.toUpperCase().trim() : "USD",
      invoicePaymentOptions: (u.invoicePaymentOptions || "").trim(),
      invoiceThankYouNote: (u.invoiceThankYouNote || "").trim(),
    });
  } catch (err) {
    console.error("Invoice customer view GET:", err);
    return NextResponse.json({ error: "Failed to load invoice" }, { status: 500 });
  }
}
