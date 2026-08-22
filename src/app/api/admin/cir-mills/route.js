import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth-admin";
import PlatformCirMills from "@/models/PlatformCirMills";
import {
  ensurePlatformCirMillsSeeded,
  serializeCirMillsDoc,
} from "@/lib/platform-cir-mills-db";
import { DEFAULT_CIR_MILLS_ROWS } from "@/lib/platform-cir-mills";
import { clampString } from "@/lib/validation";

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seed = await ensurePlatformCirMillsSeeded();
    const list = await PlatformCirMills.find({}).sort({ sortOrder: 1, size: 1 }).lean();
    return NextResponse.json({
      items: list.map(serializeCirMillsDoc),
      seeded: seed.seeded,
    });
  } catch (err) {
    console.error("Admin GET cir-mills:", err);
    return NextResponse.json({ error: err.message || "Failed to load" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    if (body?.action === "reset-defaults") {
      await connectDB();
      await PlatformCirMills.deleteMany({});
      const docs = DEFAULT_CIR_MILLS_ROWS.map((row, index) => ({
        size: String(row.size).trim(),
        circularMills: Number(row.circularMills),
        sortOrder: index,
        isActive: true,
      }));
      await PlatformCirMills.insertMany(docs);
      const list = await PlatformCirMills.find({}).sort({ sortOrder: 1, size: 1 }).lean();
      return NextResponse.json({ ok: true, items: list.map(serializeCirMillsDoc) });
    }

    const size = clampString(body?.size, 40);
    const circularMills = Number(body?.circularMills);
    if (!size) {
      return NextResponse.json({ error: "Wire size is required." }, { status: 400 });
    }
    if (!Number.isFinite(circularMills) || circularMills <= 0) {
      return NextResponse.json({ error: "Enter a positive circular mils value." }, { status: 400 });
    }

    await connectDB();
    const maxSort = await PlatformCirMills.findOne({}).sort({ sortOrder: -1 }).select("sortOrder").lean();
    const sortOrder =
      body?.sortOrder != null && Number.isFinite(Number(body.sortOrder))
        ? Number(body.sortOrder)
        : (Number(maxSort?.sortOrder) || 0) + 1;

    const doc = await PlatformCirMills.create({
      size,
      circularMills,
      sortOrder,
      isActive: body?.isActive !== false,
    });
    return NextResponse.json({ ok: true, item: serializeCirMillsDoc(doc.toObject()) });
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "That wire size already exists." }, { status: 400 });
    }
    console.error("Admin POST cir-mills:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const update = {};
    if (body.size !== undefined) {
      const size = clampString(body.size, 40);
      if (!size) return NextResponse.json({ error: "Wire size is required." }, { status: 400 });
      update.size = size;
    }
    if (body.circularMills !== undefined) {
      const cm = Number(body.circularMills);
      if (!Number.isFinite(cm) || cm <= 0) {
        return NextResponse.json({ error: "Enter a positive circular mils value." }, { status: 400 });
      }
      update.circularMills = cm;
    }
    if (body.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))) {
      update.sortOrder = Number(body.sortOrder);
    }
    if (typeof body.isActive === "boolean") update.isActive = body.isActive;

    await connectDB();
    const doc = await PlatformCirMills.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, item: serializeCirMillsDoc(doc) });
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "That wire size already exists." }, { status: 400 });
    }
    console.error("Admin PATCH cir-mills:", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await connectDB();
    const doc = await PlatformCirMills.findByIdAndDelete(id).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin DELETE cir-mills:", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
