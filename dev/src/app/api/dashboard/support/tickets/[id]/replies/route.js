import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import SupportTicket from "@/models/SupportTicket";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString } from "@/lib/validation";
import { ticketToDetail } from "@/lib/support-tickets";

function getParams(context) {
  return typeof context.params?.then === "function" ? context.params : Promise.resolve(context.params || {});
}

export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
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
    const email = user.email.trim().toLowerCase();
    const doc = await SupportTicket.findOne({ _id: id, createdByEmail: email });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (doc.status === "closed") {
      return NextResponse.json({ error: "This ticket is closed. Contact support to reopen." }, { status: 400 });
    }
    doc.replies.push({
      from: "shop",
      authorEmail: email,
      body: bodyText,
    });
    if (doc.status === "waiting_customer" || doc.status === "resolved") {
      doc.status = "open";
    }
    await doc.save();
    return NextResponse.json({ ok: true, ticket: ticketToDetail(doc) });
  } catch (err) {
    console.error("Support ticket reply (portal):", err);
    return NextResponse.json({ error: err.message || "Failed to send reply" }, { status: 500 });
  }
}
