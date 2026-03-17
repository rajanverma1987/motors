import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
import Motor from "@/models/Motor";
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

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Customer.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const additionalContacts = Array.isArray(doc.additionalContacts)
      ? doc.additionalContacts.map((ac) => ({
          contactName: String(ac?.contactName ?? "").trim(),
          phone: String(ac?.phone ?? "").trim(),
          email: String(ac?.email ?? "").trim(),
        }))
      : [];
    const customerId = doc._id.toString();
    const userEmail = user.email.trim().toLowerCase();
    const linkedMotors = await Motor.find({
      customerId,
      createdByEmail: userEmail,
    })
      .sort({ createdAt: -1 })
      .lean();
    const linkedMotorsList = linkedMotors.map((m) => ({
      id: m._id.toString(),
      serialNumber: m.serialNumber ?? "",
      manufacturer: m.manufacturer ?? "",
      model: m.model ?? "",
      hp: m.hp ?? "",
    }));
    const out = {
      id: customerId,
      companyName: doc.companyName ?? "",
      primaryContactName: doc.primaryContactName ?? "",
      phone: doc.phone ?? "",
      email: doc.email ?? "",
      address: doc.address ?? "",
      city: doc.city ?? "",
      state: doc.state ?? "",
      zipCode: doc.zipCode ?? "",
      country: doc.country ?? "United States",
      shippingAddress: doc.shippingAddress ?? "",
      shippingCity: doc.shippingCity ?? "",
      shippingState: doc.shippingState ?? "",
      shippingZipCode: doc.shippingZipCode ?? "",
      shippingCountry: doc.shippingCountry ?? "United States",
      additionalContacts,
      notes: doc.notes ?? "",
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      linkedMotors: linkedMotorsList,
    };
    return NextResponse.json(out);
  } catch (err) {
    console.error("Dashboard get customer error:", err);
    return NextResponse.json({ error: "Failed to load customer" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Customer.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    } = body;
    if (companyName !== undefined) {
      if (!String(companyName).trim()) {
        return NextResponse.json({ error: "Company name is required" }, { status: 400 });
      }
      doc.companyName = clampString(companyName, LIMITS.companyName.max);
    }
    if (primaryContactName !== undefined) doc.primaryContactName = clampString(primaryContactName, LIMITS.name.max);
    if (phone !== undefined) doc.phone = clampString(phone, 30);
    if (email !== undefined) {
      if (email?.trim() && !isValidEmail(email)) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
      doc.email = email?.trim() ? email.trim().toLowerCase().slice(0, LIMITS.email.max) : "";
    }
    if (address !== undefined) doc.address = clampString(address, LIMITS.shortText.max);
    if (city !== undefined) doc.city = clampString(city, LIMITS.city.max);
    if (state !== undefined) doc.state = clampString(state, LIMITS.state.max);
    if (zipCode !== undefined) doc.zipCode = clampString(zipCode, LIMITS.zip.max);
    if (country !== undefined) doc.country = clampString(country, 100);
    if (shippingAddress !== undefined) doc.shippingAddress = clampString(shippingAddress, LIMITS.shortText.max);
    if (shippingCity !== undefined) doc.shippingCity = clampString(shippingCity, LIMITS.city.max);
    if (shippingState !== undefined) doc.shippingState = clampString(shippingState, LIMITS.state.max);
    if (shippingZipCode !== undefined) doc.shippingZipCode = clampString(shippingZipCode, LIMITS.zip.max);
    if (shippingCountry !== undefined) doc.shippingCountry = clampString(shippingCountry, 100);
    if (additionalContacts !== undefined) {
      doc.additionalContacts = sanitizeAdditionalContacts(additionalContacts);
      doc.markModified("additionalContacts");
    }
    if (notes !== undefined) doc.notes = clampString(notes, LIMITS.message.max);
    await doc.save();
    return NextResponse.json({
      ok: true,
      customer: {
        ...doc.toObject(),
        id: doc._id.toString(),
        _id: undefined,
      },
    });
  } catch (err) {
    console.error("Dashboard update customer error:", err);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}
