import { NextResponse } from "next/server";
import path from "path";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveEntityUploadFiles } from "@/lib/safe-buffer-upload";

const UPLOAD_DIR = "public/uploads/leads";
const MAX_FILES = 5;
const MAX_SIZE_MB = 5;

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "leads-upload", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((f) => f && typeof f.arrayBuffer === "function");

    const subdir = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const dir = path.join(process.cwd(), UPLOAD_DIR, subdir);
    const uploadResult = await saveEntityUploadFiles(files, {
      profile: "image",
      maxSizeMb: MAX_SIZE_MB,
      maxFiles: MAX_FILES,
      dir,
      buildUrl: (safeName) => `/uploads/leads/${subdir}/${safeName}`,
    });
    if (!uploadResult.ok) {
      return NextResponse.json({ error: uploadResult.error }, { status: uploadResult.status || 400 });
    }

    const urls = uploadResult.attachments.map((a) => a.url);
    return NextResponse.json({ ok: true, urls });
  } catch (err) {
    console.error("Lead upload error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
