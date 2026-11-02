import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import WireSize from "@/models/WireSize";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { clampString, LIMITS } from "@/lib/validation";

function toJson(doc) {
  return {
    id: doc._id?.toString(),
    size: doc.size ?? "",
    circularMills: doc.circularMills ?? 0,
    isActive: Boolean(doc.isActive),
  };
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const list = await WireSize.find({ createdByEmail: email, isActive: true })
      .sort({ size: 1 })
      .lean();
    return NextResponse.json(list.map(toJson));
  } catch (err) {
    console.error("Dashboard wire-sizes GET error:", err);
    return NextResponse.json({ error: "Failed to load wire sizes" }, { status: 500 });
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
    const size = clampString(body?.size, LIMITS.shortText.max);
    const cm = Number(body?.circularMills);
    if (!size) {
      return NextResponse.json({ error: "Size is required" }, { status: 400 });
    }
    if (!Number.isFinite(cm) || cm <= 0) {
      return NextResponse.json({ error: "Circular mils must be a positive number" }, { status: 400 });
    }
    const email = user.email.trim().toLowerCase();
    const doc = await WireSize.create({
      createdByEmail: email,
      size,
      circularMills: cm,
      isActive: true,
    });
    return NextResponse.json(toJson(doc.toObject ? doc.toObject() : doc));
  } catch (err) {
    console.error("Dashboard wire-sizes POST error:", err);
    return NextResponse.json({ error: "Failed to save wire size" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const res = await WireSize.findOneAndUpdate(
      { _id: id, createdByEmail: email },
      { isActive: false },
      { new: true }
    ).lean();
    if (!res) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Dashboard wire-sizes DELETE error:", err);
    return NextResponse.json({ error: "Failed to remove wire size" }, { status: 500 });
  }
}
