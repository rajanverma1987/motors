import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import DiagramTemplate from "@/models/DiagramTemplate";
import {
  DIAGRAM_SCOPE_PLATFORM,
  DIAGRAM_SCOPE_SHOP,
  serializeDiagramTemplate,
  tryDeleteDiagramTemplateFile,
} from "@/lib/diagram-templates";
import { clampString } from "@/lib/validation";

/** List platform templates + this shop's templates (for Draw/View Diagram picker). */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get("q") || "").trim().toLowerCase();
    const mineOnly = String(searchParams.get("mine") || "") === "1";

    await connectDB();
    const filter = mineOnly
      ? { scope: DIAGRAM_SCOPE_SHOP, createdByEmail: email }
      : {
          $or: [
            { scope: DIAGRAM_SCOPE_PLATFORM, isActive: true },
            { scope: DIAGRAM_SCOPE_SHOP, createdByEmail: email },
          ],
        };

    const list = await DiagramTemplate.find(filter).sort({ scope: 1, sortOrder: 1, name: 1 }).lean();
    let items = list.map(serializeDiagramTemplate);
    if (q) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      );
    }
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Dashboard GET diagram-templates:", err);
    return NextResponse.json({ error: err.message || "Failed to load" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const name = clampString(body?.name, 120);
    const description = clampString(body?.description, 500);
    const imageUrl = clampString(body?.imageUrl, 500);
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!imageUrl) return NextResponse.json({ error: "Image is required." }, { status: 400 });

    await connectDB();
    const maxSort = await DiagramTemplate.findOne({
      scope: DIAGRAM_SCOPE_SHOP,
      createdByEmail: email,
    })
      .sort({ sortOrder: -1 })
      .select("sortOrder")
      .lean();
    const sortOrder = (Number(maxSort?.sortOrder) || 0) + 1;

    const doc = await DiagramTemplate.create({
      scope: DIAGRAM_SCOPE_SHOP,
      name,
      description,
      imageUrl,
      createdByEmail: email,
      sortOrder,
      isActive: body?.isActive !== false,
    });
    return NextResponse.json({ ok: true, item: serializeDiagramTemplate(doc.toObject()) });
  } catch (err) {
    console.error("Dashboard POST diagram-templates:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

    await connectDB();
    const doc = await DiagramTemplate.findOne({
      _id: id,
      scope: DIAGRAM_SCOPE_SHOP,
      createdByEmail: email,
    });
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
    await doc.save();
    return NextResponse.json({ ok: true, item: serializeDiagramTemplate(doc.toObject()) });
  } catch (err) {
    console.error("Dashboard PATCH diagram-templates:", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

    await connectDB();
    const doc = await DiagramTemplate.findOneAndDelete({
      _id: id,
      scope: DIAGRAM_SCOPE_SHOP,
      createdByEmail: email,
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    tryDeleteDiagramTemplateFile(doc.imageUrl);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Dashboard DELETE diagram-templates:", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
