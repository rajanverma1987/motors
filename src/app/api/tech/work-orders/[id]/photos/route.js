import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { connectDB } from "@/lib/db";
import WorkOrder from "@/models/WorkOrder";
import { getTechnicianFromRequest } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";

const UPLOAD_DIR = "public/uploads/work-orders";
const MAX_SIZE_MB = 12;
const MAX_PHOTOS_PER_KIND = 24;

const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function mapTechPhoto(p) {
  return {
    url: p.url || "",
    uploadedAt: p.uploadedAt ? new Date(p.uploadedAt).toISOString() : null,
    authorName: p.authorName || "",
  };
}

export async function POST(request, context) {
  const { allowed } = checkRateLimit(request, "tech-wo-photo", 40);
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }

  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await connectDB();
    const doc = await WorkOrder.findOne({
      _id: id,
      createdByEmail: tech.shopEmail,
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const assigneeId = String(doc.technicianEmployeeId || "").trim();
    const techId = String(tech.employeeId || "").trim();
    if (!assigneeId || assigneeId !== techId) {
      return NextResponse.json(
        { error: "Only the technician assigned to this work order can upload photos." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const kindRaw = String(formData.get("kind") || "").trim().toLowerCase();
    const kind = kindRaw === "after" ? "after" : kindRaw === "before" ? "before" : null;
    if (!kind) {
      return NextResponse.json({ error: 'kind must be "before" or "after"' }, { status: 400 });
    }
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Image must be under ${MAX_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    const originalName = (file.name || "").trim() || "photo.jpg";
    const ext = path.extname(originalName).toLowerCase() || ".jpg";
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPG, PNG, GIF, or WebP." },
        { status: 400 }
      );
    }

    const key = kind === "before" ? "technicianBeforePhotos" : "technicianAfterPhotos";
    if (!Array.isArray(doc[key])) doc[key] = [];
    if (doc[key].length >= MAX_PHOTOS_PER_KIND) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PHOTOS_PER_KIND} ${kind} photos per work order.` },
        { status: 400 }
      );
    }

    const dir = path.join(process.cwd(), UPLOAD_DIR, id);
    mkdirSync(dir, { recursive: true });
    const safeName = `${kind}-${Date.now()}${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(dir, safeName);
    writeFileSync(filePath, buffer);

    const url = `/uploads/work-orders/${id}/${safeName}`;
    const entry = {
      url,
      uploadedAt: new Date(),
      authorId: tech.employeeId,
      authorName: tech.name || tech.employeeEmail || "Technician",
    };
    doc[key].push(entry);
    doc.markModified(key);
    await doc.save();

    return NextResponse.json({
      ok: true,
      kind,
      photo: mapTechPhoto(entry),
      technicianBeforePhotos: (doc.technicianBeforePhotos || []).map(mapTechPhoto),
      technicianAfterPhotos: (doc.technicianAfterPhotos || []).map(mapTechPhoto),
    });
  } catch (err) {
    console.error("Tech WO photo upload:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
