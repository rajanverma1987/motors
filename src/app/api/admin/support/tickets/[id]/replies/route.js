import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import SupportTicket from "@/models/SupportTicket";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { LIMITS, clampString } from "@/lib/validation";
import { ticketToDetail } from "@/lib/support-tickets";

function getParams(context) {
  return typeof context.params?.then === "function" ? context.params : Promise.resolve(context.params || {});
}

export async function POST(request, context) {
  try {
    const adminEmail = await getAdminFromRequest(request);
    if (!adminEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const bodyText = clampString(body?.message ?? body?.body, LIMITS.message.max).trim();
    if (!bodyText) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    await connectDB();
    const doc = await SupportTicket.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const admin = String(adminEmail).trim().toLowerCase();
    doc.replies.push({
      from: "admin",
      authorEmail: admin,
      body: bodyText,
    });
    if (doc.status === "open" || doc.status === "in_progress") {
      doc.status = "waiting_customer";
    }
    await doc.save();
    return NextResponse.json({ ok: true, ticket: ticketToDetail(doc) });
  } catch (err) {
    console.error("Support ticket reply (admin):", err);
    return NextResponse.json({ error: err.message || "Failed to send reply" }, { status: 500 });
  }
}
