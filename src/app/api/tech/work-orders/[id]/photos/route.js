import { NextResponse } from "next/server";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
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

function photoArrayKey(kind) {
  return kind === "after" ? "technicianAfterPhotos" : "technicianBeforePhotos";
}

function resolveWoPhotoFile(woId, url) {
  const u = String(url || "").trim();
  const prefix = `/uploads/work-orders/${woId}/`;
  if (!u.startsWith(prefix) || u.includes("..")) return null;
  const rel = u.replace(/^\//, "");
  const full = path.resolve(path.join(process.cwd(), "public", rel));
  const allowedDir = path.resolve(path.join(process.cwd(), "public", "uploads", "work-orders", woId));
  if (!full.startsWith(`${allowedDir}${path.sep}`)) return null;
  return full;
}

async function assertAssignedTechnician(request, woId) {
  const tech = await getTechnicianFromRequest(request);
  if (!tech) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  await connectDB();
  const doc = await WorkOrder.findOne({
    _id: woId,
    createdByEmail: tech.shopEmail,
  });
  if (!doc) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  const assigneeId = String(doc.technicianEmployeeId || "").trim();
  const techId = String(tech.employeeId || "").trim();
  if (!assigneeId || assigneeId !== techId) {
    return {
      error: NextResponse.json(
        { error: "Only the technician assigned to this work order can manage photos." },
        { status: 403 }
      ),
    };
  }
  return { tech, doc };
}

export async function DELETE(request, context) {
  const { allowed } = checkRateLimit(request, "tech-wo-photo-del", 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  try {
    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const kindRaw = String(body?.kind || "").trim().toLowerCase();
    const kind = kindRaw === "after" ? "after" : kindRaw === "before" ? "before" : null;
    const url = String(body?.url || "").trim();
    if (!kind) {
      return NextResponse.json({ error: 'kind must be "before" or "after"' }, { status: 400 });
    }
    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const gate = await assertAssignedTechnician(request, id);
    if (gate.error) return gate.error;
    const { doc } = gate;

    const key = photoArrayKey(kind);
    const list = Array.isArray(doc[key]) ? doc[key] : [];
    const idx = list.findIndex((p) => String(p?.url || "").trim() === url);
    if (idx < 0) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const filePath = resolveWoPhotoFile(id, url);
    if (filePath && existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (unlinkErr) {
        console.warn("Tech WO photo unlink:", unlinkErr);
      }
    }

    list.splice(idx, 1);
    doc[key] = list;
    doc.markModified(key);
    await doc.save();

    return NextResponse.json({
      ok: true,
      kind,
      technicianBeforePhotos: (doc.technicianBeforePhotos || []).map(mapTechPhoto),
      technicianAfterPhotos: (doc.technicianAfterPhotos || []).map(mapTechPhoto),
    });
  } catch (err) {
    console.error("Tech WO photo delete:", err);
    return NextResponse.json({ error: err.message || "Delete failed" }, { status: 500 });
  }
}

export async function POST(request, context) {
  const { allowed } = checkRateLimit(request, "tech-wo-photo", 40);
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }

  try {
    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const gate = await assertAssignedTechnician(request, id);
    if (gate.error) return gate.error;
    const { tech, doc } = gate;

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

    const key = photoArrayKey(kind);
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
