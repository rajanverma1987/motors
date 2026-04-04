import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import MotorRepairJob from "@/models/MotorRepairJob";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";

const UPLOAD_DIR = "public/uploads/repair-flow-jobs";
const MAX_FILES = 20;
const MAX_SIZE_MB = 10;

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function POST(request, context) {
  const { allowed } = checkRateLimit(request, "repair-flow-job-attachments-upload", 30);
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await MotorRepairJob.findOne({
      _id: id,
      createdByEmail: email,
    });
    if (!doc) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((f) => f && typeof f.arrayBuffer === "function");
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} files per upload` }, { status: 400 });
    }

    const dir = path.join(process.cwd(), UPLOAD_DIR, id);
    mkdirSync(dir, { recursive: true });

    const attachments = Array.isArray(doc.attachments)
      ? doc.attachments.map((a) => ({
          url: String(a.url ?? "").trim(),
          name: String(a.name ?? "").trim(),
        }))
      : [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length > MAX_SIZE_MB * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds ${MAX_SIZE_MB}MB` },
          { status: 400 }
        );
      }
      const ext = path.extname(file.name) || "";
      const safeName = `${Date.now()}-${i}${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = path.join(dir, safeName);
      writeFileSync(filePath, buffer);
      const url = `/uploads/repair-flow-jobs/${id}/${safeName}`;
      const name = (file.name || safeName).trim() || safeName;
      attachments.push({ url, name });
    }

    doc.attachments = attachments.slice(-50);
    await doc.save();

    return NextResponse.json({
      ok: true,
      attachments: doc.attachments,
    });
  } catch (err) {
    console.error("Repair flow job attachment upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
