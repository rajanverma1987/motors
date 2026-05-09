import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MarketingContact from "@/models/MarketingContact";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const qText = String(searchParams.get("q") || "").trim();
    const q = status && status !== "all" ? { status } : {};
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ email: rx }, { name: rx }, { companyName: rx }, { notes: rx }];
    }
    const [totalCount, list] = await Promise.all([
      MarketingContact.countDocuments(q),
      MarketingContact.find(q).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    ]);
    const data = list.map((c) => ({
      id: c._id.toString(),
      email: c.email,
      name: c.name || "",
      companyName: c.companyName || "",
      status: c.status,
      firstEmailSentAt: c.firstEmailSentAt,
      lastEmailSentAt: c.lastEmailSentAt,
      followUpCount: c.followUpCount ?? 0,
      notes: c.notes || "",
      createdAt: c.createdAt,
    }));
    return NextResponse.json({ items: data, page, pageSize, totalCount });
  } catch (err) {
    console.error("Marketing contacts list error:", err);
    return NextResponse.json({ error: err.message || "Failed to list" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const body = await request.json();
    let toCreate = [];
    if (Array.isArray(body.emails)) {
      toCreate = body.emails
        .map((e) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
        .filter((e) => e && isValidEmail(e))
        .slice(0, 500)
        .map((email) => ({ email, name: "", companyName: "" }));
    } else if (Array.isArray(body.contacts)) {
      toCreate = body.contacts
        .filter((c) => c && c.email && isValidEmail(String(c.email).trim()))
        .slice(0, 500)
        .map((c) => ({
          email: String(c.email).trim().toLowerCase().slice(0, LIMITS.email.max),
          name: clampString(c.name, LIMITS.name.max),
          companyName: clampString(c.companyName, LIMITS.companyName.max),
        }));
    }
    if (toCreate.length === 0) {
      return NextResponse.json({ error: "No valid emails provided." }, { status: 400 });
    }
    const inserted = [];
    for (const c of toCreate) {
      const existing = await MarketingContact.findOne({ email: c.email });
      if (!existing) {
        const doc = await MarketingContact.create({ ...c, status: "pending" });
        inserted.push({ id: doc._id.toString(), email: doc.email, name: doc.name, companyName: doc.companyName });
      }
    }
    return NextResponse.json({ ok: true, added: inserted.length, total: toCreate.length, inserted });
  } catch (err) {
    console.error("Marketing contacts add error:", err);
    return NextResponse.json({ error: err.message || "Failed to add" }, { status: 500 });
  }
}
