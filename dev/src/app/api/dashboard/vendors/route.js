import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Vendor from "@/models/Vendor";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import { normalizeVendorAttachmentsFromClient } from "@/lib/vendor-attachments";

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
    const { searchParams } = new URL(request.url);
    const includePagination =
      searchParams.has("page") || searchParams.has("pageSize") || searchParams.has("q");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const qText = String(searchParams.get("q") || "").trim();
    const sortBy = String(searchParams.get("sortBy") || "name").trim();
    const sortDir = String(searchParams.get("sortDir") || "asc").toLowerCase() === "asc" ? "asc" : "desc";
    const sortFieldMap = {
      name: "name",
      contactName: "contactName",
      phone: "phone",
      email: "email",
      paymentTerms: "paymentTerms",
      createdAt: "createdAt",
    };
    const sortField = sortFieldMap[sortBy] || "name";
    const sort = { [sortField]: sortDir === "asc" ? 1 : -1, createdAt: -1 };
    const q = { createdByEmail: email };
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ name: rx }, { contactName: rx }, { email: rx }, { partsSupplied: rx }];
    }
    const [totalCount, list] = await Promise.all([
      Vendor.countDocuments(q),
      Vendor.find(q).sort(sort).skip(skip).limit(pageSize).lean(),
    ]);
    const listWithId = list.map((v) => {
      let partsSupplied = [];
      if (Array.isArray(v.partsSupplied)) {
        partsSupplied = v.partsSupplied.map((p) => (typeof p === "string" ? p : p?.item ?? ""));
      } else if (typeof v.partsSupplied === "string" && v.partsSupplied.trim()) {
        partsSupplied = [v.partsSupplied.trim()];
      }
      const attachmentCount = Array.isArray(v.attachments) ? v.attachments.length : 0;
      const { attachments: _a, ...rest } = v;
      return {
        ...rest,
        id: v._id.toString(),
        _id: undefined,
        partsSupplied,
        attachmentCount,
      };
    });
    if (!includePagination) return NextResponse.json(listWithId);
    return NextResponse.json({ items: listWithId, page, pageSize, totalCount });
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
      attachments,
    } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
    }
    if (email?.trim() && !isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const partsSuppliedArr = normalizePartsSupplied(partsSupplied);
    const attachmentsArr = normalizeVendorAttachmentsFromClient(attachments);
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
      attachments: attachmentsArr,
      createdByEmail: user.email.trim().toLowerCase(),
    });
    const vo = doc.toObject();
    return NextResponse.json({
      ok: true,
      vendor: {
        ...vo,
        id: doc._id.toString(),
        _id: undefined,
        attachments: Array.isArray(vo.attachments) ? vo.attachments : [],
        attachmentCount: Array.isArray(vo.attachments) ? vo.attachments.length : 0,
      },
    });
  } catch (err) {
    console.error("Dashboard create vendor error:", err);
    return NextResponse.json({ error: err.message || "Failed to create vendor" }, { status: 500 });
  }
}
