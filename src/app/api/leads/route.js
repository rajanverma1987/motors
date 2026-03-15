import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import { getAdminFromRequest } from "@/lib/auth-admin";

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      name,
      email,
      phone,
      message,
      listingId,
      company,
      city,
      zipCode,
      motorType,
      motorHp,
      voltage,
      problemDescription,
      urgencyLevel,
      motorPhotos,
    } = body;
    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email required" },
        { status: 400 }
      );
    }
    const doc = await Lead.create({
      name: name.trim(),
      email: email.trim(),
      phone: (phone || "").trim(),
      message: (message || "").trim(),
      company: (company || "").trim(),
      city: (city || "").trim(),
      zipCode: (zipCode || "").trim(),
      motorType: (motorType || "").trim(),
      motorHp: (motorHp || "").trim(),
      voltage: (voltage || "").trim(),
      problemDescription: (problemDescription || "").trim(),
      urgencyLevel: (urgencyLevel || "").trim(),
      motorPhotos: Array.isArray(motorPhotos) ? motorPhotos.filter(Boolean) : [],
      sourceListingId: (listingId || "").trim(),
      assignedListingIds: [],
    });
    return NextResponse.json({ ok: true, id: doc._id.toString() });
  } catch (err) {
    console.error("Create lead error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const list = await Lead.find()
      .sort({ createdAt: -1 })
      .lean();
    const listWithId = list.map((l) => ({
      ...l,
      id: l._id.toString(),
      _id: undefined,
    }));
    return NextResponse.json(listWithId);
  } catch (err) {
    console.error("List leads error:", err);
    return NextResponse.json(
      { error: "Failed to list" },
      { status: 500 }
    );
  }
}
