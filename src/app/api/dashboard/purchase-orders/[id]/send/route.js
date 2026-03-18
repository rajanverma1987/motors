import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { connectDB } from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import Vendor from "@/models/Vendor";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { sendPoToVendor } from "@/lib/email";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { buildPoVendorAddressesEmailBlock } from "@/lib/accounts-display";

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
    if (!id) {
      return NextResponse.json({ error: "PO ID required" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await PurchaseOrder.findOne({
      _id: id,
      createdByEmail: email,
    });
    if (!doc) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const vendor = await Vendor.findOne({
      _id: doc.vendorId,
      createdByEmail: email,
    }).lean();
    const toEmail = vendor?.email?.trim();
    if (!toEmail) {
      return NextResponse.json(
        { error: "Vendor has no email address. Add an email to the vendor record." },
        { status: 400 }
      );
    }

    if (!doc.vendorShareToken?.trim()) {
      let token;
      let exists = true;
      for (let i = 0; i < 5; i++) {
        token = randomBytes(24).toString("hex");
        const existing = await PurchaseOrder.findOne({ vendorShareToken: token }).lean();
        if (!existing) {
          exists = false;
          break;
        }
      }
      doc.vendorShareToken = exists ? randomBytes(24).toString("hex") : token;
      await doc.save();
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (request.headers.get("x-forwarded-proto") && request.headers.get("host")
        ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("host")}`
        : "") ||
      "https://motorswinding.com";
    const viewUrl = `${baseUrl.replace(/\/$/, "")}/po/${doc.vendorShareToken}`;
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

    const poVendorAddressesHtml = buildPoVendorAddressesEmailBlock({
      billingAddress: uSettings.accountsBillingAddress,
      shippingAddress: uSettings.accountsShippingAddress,
    });

    const emailResult = await sendPoToVendor(
      toEmail,
      vendor.name || vendor.contactName,
      doc.poNumber || "",
      viewUrl,
      shopCompanyName,
      {
        ...(logoAbsoluteUrl ? { logoAbsoluteUrl } : {}),
        ...(poVendorAddressesHtml.trim() ? { poVendorAddressesHtml } : {}),
      }
    );
    if (!emailResult.ok) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Purchase order sent to vendor.",
    });
  } catch (err) {
    console.error("PO send to vendor error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to send purchase order" },
      { status: 500 }
    );
  }
}
