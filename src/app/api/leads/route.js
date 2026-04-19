import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Listing from "@/models/Listing";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, LIMITS, clampString, clampArray } from "@/lib/validation";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { sendNewWebsiteLeadNotificationToShop, sendRewindCalculatorRfqToAdmin } from "@/lib/email";
import { sanitizeCalculatorContext } from "@/lib/motor-rewind-cost/sanitize-calculator-context";
import { computeCustomerRewindBallpark } from "@/lib/motor-rewind-cost/calculate";
import { buildRewindCalculatorPdfBuffer } from "@/lib/motor-rewind-cost/build-calculator-pdf";

export async function POST(request) {
  const { allowed } = checkRateLimit(request, "lead", 20);
  if (!allowed) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }
  try {
    await connectDB();
    const body = await request.json();
    const {
      name,
      email,
      phone,
      message,
      listingId,
      company,
      city,
      zipCode,
      motorType,
      motorHp,
      voltage,
      problemDescription,
      urgencyLevel,
      motorPhotos,
      calculatorContext: rawCalculatorContext,
    } = body;
    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email required" },
        { status: 400 }
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    let sourceListingId = "";
    let assignedListingIds = [];
    /** If RFQ came from a public listing page, notify that shop by email after create. */
    let listingNotify = null;
    const rawListingId = listingId != null ? String(listingId).trim() : "";
    if (rawListingId) {
      if (!mongoose.isValidObjectId(rawListingId)) {
        return NextResponse.json({ error: "Invalid listing reference." }, { status: 400 });
      }
      const listingDoc = await Listing.findOne({ _id: rawListingId, status: "approved" })
        .select("_id email companyName")
        .lean();
      if (!listingDoc) {
        return NextResponse.json(
          { error: "Listing not found or not available for inquiries." },
          { status: 400 }
        );
      }
      sourceListingId = listingDoc._id.toString();
      /** Shop sees this lead in CRM; admin list shows it assigned to this listing company. */
      assignedListingIds = [sourceListingId];
      listingNotify = {
        email: listingDoc.email ? String(listingDoc.email).trim() : "",
        companyName: listingDoc.companyName || "",
      };
    }

    const sanitizedCalc = sanitizeCalculatorContext(rawCalculatorContext);
    let serverBreakdown = null;
    let problemOut = clampString(problemDescription, LIMITS.message.max);
    let messageOut = clampString(message, LIMITS.message.max);
    if (sanitizedCalc) {
      try {
        const calcInput = {
          ...sanitizedCalc.form,
          slots: Number(sanitizedCalc.form.slots),
          voltage: Number(sanitizedCalc.form.voltage),
        };
        const bd = computeCustomerRewindBallpark(calcInput);
        const prefix = `[Rewind calculator ballpark ≈ $${bd.ballparkTotal} USD; equiv. ${bd.motorHp} HP]\n\n`;
        problemOut = clampString(`${prefix}${(problemDescription || "").trim()}`, LIMITS.message.max);
        messageOut = clampString(
          JSON.stringify({
            source: "rewind-calculator",
            ballparkUsd: bd.ballparkTotal,
            motorHp: bd.motorHp,
            page: sanitizedCalc.sourcePage || "",
          }),
          LIMITS.message.max,
        );
        serverBreakdown = bd;
      } catch (e) {
        console.warn("Calculator context recompute failed:", e);
      }
    }

    const doc = await Lead.create({
      name: clampString(name, LIMITS.name.max),
      email: (email.trim().toLowerCase()).slice(0, LIMITS.email.max),
      phone: clampString(phone, 30),
      message: messageOut,
      company: clampString(company, LIMITS.companyName.max),
      city: clampString(city, LIMITS.city.max),
      zipCode: clampString(zipCode, LIMITS.zip.max),
      motorType: clampString(motorType, LIMITS.shortText.max),
      motorHp: clampString(motorHp, LIMITS.shortText.max),
      voltage: clampString(voltage, LIMITS.shortText.max),
      problemDescription: problemOut,
      urgencyLevel: clampString(urgencyLevel, LIMITS.shortText.max),
      motorPhotos: clampArray(motorPhotos, 20),
      sourceListingId: clampString(sourceListingId, 50),
      assignedListingIds,
      leadSource: "website",
    });

    if (listingNotify?.email && isValidEmail(listingNotify.email)) {
      try {
        await sendNewWebsiteLeadNotificationToShop({
          to: listingNotify.email,
          listingCompanyName: listingNotify.companyName,
          leadContactName: doc.name,
          leadContactCompany: doc.company,
          siteUrl: getPublicSiteUrl(request),
        });
      } catch (e) {
        console.warn("Notify listing shop of new lead email failed:", e);
      }
    }

    if (sanitizedCalc && serverBreakdown) {
      try {
        const pdfBuffer = await buildRewindCalculatorPdfBuffer({
          form: sanitizedCalc.form,
          breakdown: serverBreakdown,
        });
        const esc = (v) =>
          v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        const rows = [
          ["Equiv. HP", serverBreakdown.motorHp],
          ["Copper & wire (est.)", `$${serverBreakdown.copperCost}`],
          ["Insulation / varnish (est.)", `$${serverBreakdown.materialCost}`],
          ["Labor band (est.)", `$${serverBreakdown.laborUsd}`],
          ["Ballpark total (USD)", `$${serverBreakdown.ballparkTotal}`],
        ]
          .map(
            ([a, b]) =>
              `<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:600;">${esc(a)}</td><td style="padding:6px 10px;border:1px solid #ddd;">${esc(b)}</td></tr>`,
          )
          .join("");
        await sendRewindCalculatorRfqToAdmin({
          leadName: doc.name,
          leadEmail: doc.email,
          leadPhone: doc.phone,
          leadCity: doc.city,
          leadZip: doc.zipCode,
          problemDescription: doc.problemDescription,
          htmlRows: rows,
          pdfBuffer,
        });
      } catch (e) {
        console.warn("Rewind calculator RFQ admin email failed:", e);
      }
    }

    return NextResponse.json({ ok: true, id: doc._id.toString() });
  } catch (err) {
    console.error("Create lead error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const list = await Lead.find()
      .sort({ createdAt: -1 })
      .lean();
    const listWithId = list.map((l) => ({
      ...l,
      id: l._id.toString(),
      _id: undefined,
    }));
    return NextResponse.json(listWithId);
  } catch (err) {
    console.error("List leads error:", err);
    return NextResponse.json(
      { error: "Failed to list" },
      { status: 500 }
    );
  }
}
