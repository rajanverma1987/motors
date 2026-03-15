import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const UPLOAD_DIR = "public/uploads/listings";
const MAX_FILES = 15;
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((f) => f && typeof f.arrayBuffer === "function");
    if (files.length === 0) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      );
    }

    const dir = path.join(process.cwd(), UPLOAD_DIR, id);
    mkdirSync(dir, { recursive: true });

    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = (file.type || "").toLowerCase();
      if (!ALLOWED_TYPES.includes(type)) {
        return NextResponse.json(
          { error: "Only JPEG, PNG, GIF, or WebP images are allowed." },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length > MAX_SIZE_MB * 1024 * 1024) {
        return NextResponse.json(
          { error: `File must be under ${MAX_SIZE_MB}MB` },
          { status: 400 }
        );
      }
      const ext = path.extname(file.name) || ".jpg";
      const safeName = `${Date.now()}-${i}${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = path.join(dir, safeName);
      writeFileSync(filePath, buffer);
      urls.push(`/uploads/listings/${id}/${safeName}`);
    }

    return NextResponse.json({ ok: true, urls });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
