import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const UPLOAD_DIR = "public/uploads/leads";
const MAX_FILES = 5;
const MAX_SIZE_MB = 5;

export async function POST(request) {
  try {
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

    const subdir = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const dir = path.join(process.cwd(), UPLOAD_DIR, subdir);
    mkdirSync(dir, { recursive: true });

    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length > MAX_SIZE_MB * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds ${MAX_SIZE_MB}MB` },
          { status: 400 }
        );
      }
      const ext = path.extname(file.name) || ".jpg";
      const safeName = `${Date.now()}-${i}${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = path.join(dir, safeName);
      writeFileSync(filePath, buffer);
      urls.push(`/uploads/leads/${subdir}/${safeName}`);
    }

    return NextResponse.json({ ok: true, urls });
  } catch (err) {
    console.error("Lead upload error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
