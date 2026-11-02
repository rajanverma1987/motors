import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import SupportTicket from "@/models/SupportTicket";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { normalizeStatus, ticketToDetail } from "@/lib/support-tickets";

function getParams(context) {
  return typeof context.params?.then === "function" ? context.params : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
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
    await connectDB();
    const doc = await SupportTicket.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(ticketToDetail(doc));
  } catch (err) {
    console.error("Support ticket get (admin):", err);
    return NextResponse.json({ error: "Failed to load ticket" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
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
    const st = normalizeStatus(body?.status);
    if (!st) {
      return NextResponse.json({ error: "Valid status is required" }, { status: 400 });
    }
    await connectDB();
    const doc = await SupportTicket.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    doc.status = st;
    await doc.save();
    return NextResponse.json({ ok: true, ticket: ticketToDetail(doc) });
  } catch (err) {
    console.error("Support ticket patch (admin):", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}
