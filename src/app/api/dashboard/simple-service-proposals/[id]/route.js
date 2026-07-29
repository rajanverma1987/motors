import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import {
  isValidSimplePortalId,
  sanitizeSimplePortalPayload,
  serializeSimplePortalDoc,
} from "@/lib/simple-portal-mongo";

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
    const id = String(params?.id || "").trim();
    if (!isValidSimplePortalId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await SimpleServiceProposal.findOne({ _id: id, createdByEmail: email }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item: serializeSimplePortalDoc(doc) });
  } catch (err) {
    console.error("Dashboard get simple service proposal error:", err);
    return NextResponse.json({ error: "Failed to load service proposal" }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = String(params?.id || "").trim();
    if (!isValidSimplePortalId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const payload = sanitizeSimplePortalPayload(body);
    const update = {
      ...payload,
      customerId: String(payload.customerId ?? "").trim(),
      documentNumber: String(payload.documentNumber || payload.quote || "").trim(),
      recordType: String(payload.recordType || "RFQ").trim().toUpperCase() || "RFQ",
      status: String(payload.status ?? "").trim(),
      jobStatus: String(payload.jobStatus ?? "").trim(),
      dateCreated: String(payload.dateCreated || payload.date || "").trim(),
      companyName: String(payload.companyName ?? "").trim(),
    };
    const doc = await SimpleServiceProposal.findOneAndUpdate(
      { _id: id, createdByEmail: email },
      { $set: update },
      { new: true }
    ).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item: serializeSimplePortalDoc(doc) });
  } catch (err) {
    console.error("Dashboard update simple service proposal error:", err);
    return NextResponse.json({ error: err.message || "Failed to update service proposal" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = String(params?.id || "").trim();
    if (!isValidSimplePortalId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const deleted = await SimpleServiceProposal.findOneAndDelete({ _id: id, createdByEmail: email }).lean();
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("Dashboard delete simple service proposal error:", err);
    return NextResponse.json({ error: "Failed to delete service proposal" }, { status: 500 });
  }
}
