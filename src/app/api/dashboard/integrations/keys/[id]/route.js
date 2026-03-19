import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import IntegrationApiKey from "@/models/IntegrationApiKey";

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Key id required" }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    await connectDB();
    const doc = await IntegrationApiKey.findOneAndUpdate(
      { _id: id, ownerEmail: email },
      { $set: { active: body.active !== false } },
      { new: true }
    ).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, active: doc.active });
  } catch (err) {
    console.error("PATCH key:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Key id required" }, { status: 400 });
    await connectDB();
    const r = await IntegrationApiKey.deleteOne({ _id: id, ownerEmail: email });
    if (!r.deletedCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE key:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
