import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Vendor from "@/models/Vendor";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";

const MAX_PARTS_ITEMS = 100;
/** Normalize to array of strings (accepts array of strings or array of { item } from frontend) */
function normalizePartsSupplied(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, MAX_PARTS_ITEMS)
    .map((row) => (typeof row === "string" ? row : row?.item))
    .filter((s) => s != null && String(s).trim() !== "")
    .map((s) => clampString(String(s), LIMITS.shortText.max));
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
    const doc = await Vendor.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    let partsSupplied = [];
    if (Array.isArray(doc.partsSupplied)) {
      partsSupplied = doc.partsSupplied.map((p) => (typeof p === "string" ? p : p?.item ?? ""));
    } else if (typeof doc.partsSupplied === "string" && doc.partsSupplied.trim()) {
      partsSupplied = [doc.partsSupplied.trim()];
    }
    const out = {
      id: doc._id.toString(),
      name: doc.name ?? "",
      contactName: doc.contactName ?? "",
      phone: doc.phone ?? "",
      email: doc.email ?? "",
      address: doc.address ?? "",
      city: doc.city ?? "",
      state: doc.state ?? "",
      zipCode: doc.zipCode ?? "",
      partsSupplied,
      paymentTerms: doc.paymentTerms ?? "",
      notes: doc.notes ?? "",
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
    return NextResponse.json(out);
  } catch (err) {
    console.error("Dashboard get vendor error:", err);
    return NextResponse.json({ error: "Failed to load vendor" }, { status: 500 });
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
    const doc = await Vendor.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await request.json();
    const {
      name,
      contactName,
      phone,
      email,
      address,
      city,
      state,
      zipCode,
      partsSupplied,
      paymentTerms,
      notes,
    } = body;
    if (name !== undefined) {
      if (!String(name).trim()) {
        return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
      }
      doc.name = clampString(name, LIMITS.companyName.max);
    }
    if (contactName !== undefined) doc.contactName = clampString(contactName, LIMITS.name.max);
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
    if (partsSupplied !== undefined) {
      doc.partsSupplied = normalizePartsSupplied(partsSupplied);
      doc.markModified("partsSupplied");
    }
    if (paymentTerms !== undefined) doc.paymentTerms = clampString(paymentTerms, LIMITS.shortText.max);
    if (notes !== undefined) doc.notes = clampString(notes, LIMITS.message.max);
    await doc.save();
    return NextResponse.json({
      ok: true,
      vendor: {
        ...doc.toObject(),
        id: doc._id.toString(),
        _id: undefined,
      },
    });
  } catch (err) {
    console.error("Dashboard update vendor error:", err);
    return NextResponse.json({ error: err.message || "Failed to update vendor" }, { status: 500 });
  }
}
