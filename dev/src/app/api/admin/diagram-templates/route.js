import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth-admin";
import DiagramTemplate from "@/models/DiagramTemplate";
import {
  DIAGRAM_SCOPE_PLATFORM,
  serializeDiagramTemplate,
  tryDeleteDiagramTemplateFile,
} from "@/lib/diagram-templates";
import { clampString } from "@/lib/validation";

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get("q") || "").trim().toLowerCase();
    const filter = { scope: DIAGRAM_SCOPE_PLATFORM };
    const list = await DiagramTemplate.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
    let items = list.map(serializeDiagramTemplate);
    if (q) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      );
    }
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Admin GET diagram-templates:", err);
    return NextResponse.json({ error: err.message || "Failed to load" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const name = clampString(body?.name, 120);
    const description = clampString(body?.description, 500);
    const imageUrl = clampString(body?.imageUrl, 500);
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!imageUrl) return NextResponse.json({ error: "Image is required." }, { status: 400 });

    await connectDB();
    const maxSort = await DiagramTemplate.findOne({ scope: DIAGRAM_SCOPE_PLATFORM })
      .sort({ sortOrder: -1 })
      .select("sortOrder")
      .lean();
    const sortOrder =
      body?.sortOrder != null && Number.isFinite(Number(body.sortOrder))
        ? Number(body.sortOrder)
        : (Number(maxSort?.sortOrder) || 0) + 1;

    const doc = await DiagramTemplate.create({
      scope: DIAGRAM_SCOPE_PLATFORM,
      name,
      description,
      imageUrl,
      createdByEmail: "",
      sortOrder,
      isActive: body?.isActive !== false,
    });
    return NextResponse.json({ ok: true, item: serializeDiagramTemplate(doc.toObject()) });
  } catch (err) {
    console.error("Admin POST diagram-templates:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

    await connectDB();
    const doc = await DiagramTemplate.findOne({ _id: id, scope: DIAGRAM_SCOPE_PLATFORM });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.name != null) {
      const name = clampString(body.name, 120);
      if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
      doc.name = name;
    }
    if (body.description != null) doc.description = clampString(body.description, 500);
    if (body.imageUrl != null) {
      const imageUrl = clampString(body.imageUrl, 500);
      if (!imageUrl) return NextResponse.json({ error: "Image is required." }, { status: 400 });
      if (imageUrl !== doc.imageUrl) {
        tryDeleteDiagramTemplateFile(doc.imageUrl);
        doc.imageUrl = imageUrl;
      }
    }
    if (body.isActive != null) doc.isActive = Boolean(body.isActive);
    if (body.sortOrder != null && Number.isFinite(Number(body.sortOrder))) {
      doc.sortOrder = Number(body.sortOrder);
    }
    await doc.save();
    return NextResponse.json({ ok: true, item: serializeDiagramTemplate(doc.toObject()) });
  } catch (err) {
    console.error("Admin PATCH diagram-templates:", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

    await connectDB();
    const doc = await DiagramTemplate.findOneAndDelete({ _id: id, scope: DIAGRAM_SCOPE_PLATFORM });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    tryDeleteDiagramTemplateFile(doc.imageUrl);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin DELETE diagram-templates:", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
