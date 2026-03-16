import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MarketingContact from "@/models/MarketingContact";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { LIMITS, clampString } from "@/lib/validation";

const ALLOWED_STATUS = ["pending", "contacted", "replied", "listed", "do_not_contact", "unsubscribed"];

export async function PATCH(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const doc = await MarketingContact.findById(id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await request.json();
    if (body.status != null && ALLOWED_STATUS.includes(body.status)) doc.status = body.status;
    if (body.notes !== undefined) doc.notes = clampString(body.notes, 1000);
    if (body.name !== undefined) doc.name = clampString(body.name, LIMITS.name.max);
    if (body.companyName !== undefined) doc.companyName = clampString(body.companyName, LIMITS.companyName.max);
    await doc.save();
    return NextResponse.json({
      ok: true,
      contact: {
        id: doc._id.toString(),
        email: doc.email,
        name: doc.name || "",
        companyName: doc.companyName || "",
        status: doc.status,
        firstEmailSentAt: doc.firstEmailSentAt,
        lastEmailSentAt: doc.lastEmailSentAt,
        followUpCount: doc.followUpCount ?? 0,
        notes: doc.notes || "",
      },
    });
  } catch (err) {
    console.error("Marketing contact update error:", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const doc = await MarketingContact.findByIdAndDelete(id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Marketing contact delete error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
