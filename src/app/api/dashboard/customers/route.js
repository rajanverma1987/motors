import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";

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
    const list = await Customer.find({ createdByEmail: email })
      .sort({ companyName: 1, createdAt: -1 })
      .lean();
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
      };
    });
    return NextResponse.json(listWithId);
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
