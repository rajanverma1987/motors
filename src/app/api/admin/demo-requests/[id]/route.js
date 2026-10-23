import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import DemoRequest from "@/models/DemoRequest";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { clampString } from "@/lib/validation";

const STATUSES = ["new", "contacted", "demo_booked", "won", "lost"];

function toDetail(doc) {
  return {
    id: String(doc._id),
    formType: doc.formType || "demo",
    name: doc.name || "",
    email: doc.email || "",
    phone: doc.phone || "",
    businessName: doc.businessName || "",
    website: doc.website || "",
    city: doc.city || "",
    state: doc.state || "",
    businessType: doc.businessType || "",
    teamSize: doc.teamSize || "",
    preferDate: doc.preferDate || "",
    preferTime: doc.preferTime || "",
    timezone: doc.timezone || "",
    currentTools: doc.currentTools || "",
    mainProblem: doc.mainProblem || "",
    sourcePage: doc.sourcePage || "",
    status: doc.status || "new",
    adminNotes: doc.adminNotes || "",
    notifyEmailStatus: doc.notifyEmailStatus || "pending",
    notifyEmailError: doc.notifyEmailError || "",
    thankYouEmailStatus: doc.thankYouEmailStatus || "pending",
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}

async function findById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return DemoRequest.findById(id);
}

export async function GET(request, { params }) {
  try {
    const adminEmail = await getAdminFromRequest(request);
    if (!adminEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const resolved = typeof params?.then === "function" ? await params : params ?? {};
    await connectDB();
    const doc = await findById(resolved.id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(toDetail(doc));
  } catch (err) {
    console.error("Demo request detail (admin):", err);
    return NextResponse.json({ error: "Failed to load demo request" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const adminEmail = await getAdminFromRequest(request);
    if (!adminEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const resolved = typeof params?.then === "function" ? await params : params ?? {};
    await connectDB();
    const doc = await findById(resolved.id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    if (body?.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      doc.status = body.status;
    }
    if (body?.adminNotes !== undefined) {
      doc.adminNotes = clampString(body.adminNotes, 4000);
    }
    await doc.save();
    return NextResponse.json({ request: toDetail(doc) });
  } catch (err) {
    console.error("Demo request update (admin):", err);
    return NextResponse.json({ error: "Failed to update demo request" }, { status: 500 });
  }
}
