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

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const list = await Vendor.find({ createdByEmail: email })
      .sort({ name: 1, createdAt: -1 })
      .lean();
    const listWithId = list.map((v) => {
      let partsSupplied = [];
      if (Array.isArray(v.partsSupplied)) {
        partsSupplied = v.partsSupplied.map((p) => (typeof p === "string" ? p : p?.item ?? ""));
      } else if (typeof v.partsSupplied === "string" && v.partsSupplied.trim()) {
        partsSupplied = [v.partsSupplied.trim()];
      }
      return {
        ...v,
        id: v._id.toString(),
        _id: undefined,
        partsSupplied,
      };
    });
    return NextResponse.json(listWithId);
  } catch (err) {
    console.error("Dashboard list vendors error:", err);
    return NextResponse.json({ error: "Failed to list vendors" }, { status: 500 });
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
    if (!name?.trim()) {
      return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
    }
    if (email?.trim() && !isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const partsSuppliedArr = normalizePartsSupplied(partsSupplied);
    const doc = await Vendor.create({
      name: clampString(name, LIMITS.companyName.max),
      contactName: clampString(contactName, LIMITS.name.max),
      phone: clampString(phone, 30),
      email: email?.trim() ? email.trim().toLowerCase().slice(0, LIMITS.email.max) : "",
      address: clampString(address, LIMITS.shortText.max),
      city: clampString(city, LIMITS.city.max),
      state: clampString(state, LIMITS.state.max),
      zipCode: clampString(zipCode, LIMITS.zip.max),
      partsSupplied: partsSuppliedArr,
      paymentTerms: clampString(paymentTerms, LIMITS.shortText.max),
      notes: clampString(notes, LIMITS.message.max),
      createdByEmail: user.email.trim().toLowerCase(),
    });
    return NextResponse.json({
      ok: true,
      vendor: {
        ...doc.toObject(),
        id: doc._id.toString(),
        _id: undefined,
      },
    });
  } catch (err) {
    console.error("Dashboard create vendor error:", err);
    return NextResponse.json({ error: err.message || "Failed to create vendor" }, { status: 500 });
  }
}
