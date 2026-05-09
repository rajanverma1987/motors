import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import {
  LISTING_ONLY_UPGRADE_MESSAGE,
  LISTING_ONLY_MAX_CUSTOMERS,
} from "@/lib/listing-account-messages";
import { userIsListingOnlyAccount, listingOnlyCustomerCount } from "@/lib/listing-account-restrictions";
import { normalizeTaxExempt, normalizeTaxPercent } from "@/lib/quote-invoice-totals";

const MAX_ADDITIONAL_CONTACTS = 20;
function sanitizeAdditionalContacts(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, MAX_ADDITIONAL_CONTACTS).map((item) => ({
    contactName: clampString(item?.contactName, LIMITS.name.max),
    phone: clampString(item?.phone, 30),
    email: item?.email?.trim() && isValidEmail(item.email) ? item.email.trim().toLowerCase().slice(0, LIMITS.email.max) : "",
  }));
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const qText = String(searchParams.get("q") || "").trim();
    const sortBy = String(searchParams.get("sortBy") || "companyName").trim();
    const sortDir = String(searchParams.get("sortDir") || "asc").toLowerCase() === "asc" ? "asc" : "desc";
    const sortFieldMap = {
      companyName: "companyName",
      primaryContactName: "primaryContactName",
      phone: "phone",
      email: "email",
      ein: "ein",
      creditLimit: "creditLimit",
      taxExempt: "taxExempt",
      taxPercent: "taxPercent",
      city: "city",
      createdAt: "createdAt",
    };
    const sortField = sortFieldMap[sortBy] || "companyName";
    const sort = { [sortField]: sortDir === "asc" ? 1 : -1, createdAt: -1 };
    const q = { createdByEmail: email };
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [
        { companyName: rx },
        { primaryContactName: rx },
        { email: rx },
        { phone: rx },
        { city: rx },
      ];
    }
    const [totalCount, list] = await Promise.all([
      Customer.countDocuments(q),
      Customer.find(q).sort(sort).skip(skip).limit(pageSize).lean(),
    ]);
    const listWithId = list.map((c) => {
      const additionalContacts = Array.isArray(c.additionalContacts)
        ? c.additionalContacts.map((ac) => ({
            contactName: ac?.contactName ?? "",
            phone: ac?.phone ?? "",
            email: ac?.email ?? "",
          }))
        : [];
      return {
        ...c,
        id: c._id.toString(),
        _id: undefined,
        shippingAddress: c.shippingAddress ?? "",
        shippingCity: c.shippingCity ?? "",
        shippingState: c.shippingState ?? "",
        shippingZipCode: c.shippingZipCode ?? "",
        shippingCountry: c.shippingCountry ?? "United States",
        additionalContacts,
        ein: c.ein ?? "",
        creditLimit: c.creditLimit ?? "",
        taxExempt: normalizeTaxExempt(c.taxExempt),
        taxPercent: String(normalizeTaxPercent(c.taxPercent)),
      };
    });
    return NextResponse.json({ items: listWithId, page, pageSize, totalCount });
  } catch (err) {
    console.error("Dashboard list customers error:", err);
    return NextResponse.json({ error: "Failed to list customers" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const ownerEmail = user.email.trim().toLowerCase();
    if (await userIsListingOnlyAccount(ownerEmail)) {
      const n = await listingOnlyCustomerCount(ownerEmail);
      if (n >= LISTING_ONLY_MAX_CUSTOMERS) {
        return NextResponse.json(
          { error: LISTING_ONLY_UPGRADE_MESSAGE, code: "LISTING_ONLY_CUSTOMER_CAP" },
          { status: 403 }
        );
      }
    }
    const body = await request.json();
    const {
      companyName,
      primaryContactName,
      phone,
      email,
      address,
      city,
      state,
      zipCode,
      country,
      shippingAddress,
      shippingCity,
      shippingState,
      shippingZipCode,
      shippingCountry,
      additionalContacts,
      notes,
      ein,
      creditLimit,
      taxExempt,
      taxPercent,
    } = body;
    if (!companyName?.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }
    if (email?.trim() && !isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const doc = await Customer.create({
      companyName: clampString(companyName, LIMITS.companyName.max),
      primaryContactName: clampString(primaryContactName, LIMITS.name.max),
      phone: clampString(phone, 30),
      email: email?.trim() ? email.trim().toLowerCase().slice(0, LIMITS.email.max) : "",
      address: clampString(address, LIMITS.shortText.max),
      city: clampString(city, LIMITS.city.max),
      state: clampString(state, LIMITS.state.max),
      zipCode: clampString(zipCode, LIMITS.zip.max),
      country: clampString(country, 100),
      shippingAddress: clampString(shippingAddress, LIMITS.shortText.max),
      shippingCity: clampString(shippingCity, LIMITS.city.max),
      shippingState: clampString(shippingState, LIMITS.state.max),
      shippingZipCode: clampString(shippingZipCode, LIMITS.zip.max),
      shippingCountry: clampString(shippingCountry, 100),
      additionalContacts: sanitizeAdditionalContacts(additionalContacts),
      notes: clampString(notes, LIMITS.message.max),
      ein: clampString(ein, 50),
      creditLimit: clampString(creditLimit, 50),
      taxExempt: normalizeTaxExempt(taxExempt),
      taxPercent: String(normalizeTaxPercent(taxPercent)),
      createdByEmail: user.email.trim().toLowerCase(),
    });
    return NextResponse.json({
      ok: true,
      customer: {
        ...doc.toObject(),
        id: doc._id.toString(),
        _id: undefined,
      },
    });
  } catch (err) {
    console.error("Dashboard create customer error:", err);
    return NextResponse.json({ error: err.message || "Failed to create customer" }, { status: 500 });
  }
}
