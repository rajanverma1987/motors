import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import Quote from "@/models/Quote";
import Customer from "@/models/Customer";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { sendQuoteToCustomer } from "@/lib/email";

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
      return NextResponse.json({ error: "Quote ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Quote.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    });
    if (!doc) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const customer = await Customer.findOne({
      _id: doc.customerId,
      createdByEmail: user.email.trim().toLowerCase(),
    }).lean();
    const toEmail = customer?.email?.trim();
    if (!toEmail) {
      return NextResponse.json(
        { error: "Customer has no email address. Add an email to the customer record." },
        { status: 400 }
      );
    }

    if (!doc.respondToken || !doc.respondToken.trim()) {
      doc.respondToken = crypto.randomBytes(24).toString("hex");
      await doc.save();
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (request.headers.get("x-forwarded-proto") && request.headers.get("host")
        ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("host")}`
        : "") ||
      "https://motorswinding.com";
    const respondUrl = `${baseUrl.replace(/\/$/, "")}/quote/respond/${doc.respondToken}`;
    const shopCompanyName = process.env.MOTOR_SHOP_COMPANY_NAME?.trim() || "";

    const emailResult = await sendQuoteToCustomer(
      toEmail,
      customer.primaryContactName || customer.companyName,
      doc.rfqNumber,
      respondUrl,
      shopCompanyName
    );
    if (!emailResult.ok) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send email" },
        { status: 500 }
      );
    }

    const previousStatus = doc.status || "draft";
    if (previousStatus !== "sent") {
      if (!Array.isArray(doc.statusLog)) doc.statusLog = [];
      doc.statusLog.push({
        from: previousStatus,
        to: "sent",
        at: new Date(),
        by: (user.contactName && user.contactName.trim()) || (user.shopName && user.shopName.trim()) || user.email?.trim() || "",
      });
      doc.markModified("statusLog");
    }
    doc.status = "sent";
    await doc.save();

    return NextResponse.json({
      ok: true,
      message: "Quote sent to customer. Status set to Sent.",
      quote: {
        ...doc.toObject(),
        id: doc._id.toString(),
        _id: undefined,
      },
    });
  } catch (err) {
    console.error("Quote send error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to send quote" },
      { status: 500 }
    );
  }
}
