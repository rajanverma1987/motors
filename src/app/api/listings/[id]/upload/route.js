import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth-admin";
import {
  publicUploadUrlPath,
  resolvePublicUploadEntityDir,
  sanitizeUploadSegment,
} from "@/lib/public-upload-fs";
import { saveEntityUploadFiles } from "@/lib/safe-buffer-upload";

const LISTING_UPLOAD_CATEGORY = "listings";
const MAX_FILES = 15;
const MAX_SIZE_MB = 5;

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
    const safeId = sanitizeUploadSegment(id);
    if (!safeId) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((f) => f && typeof f.arrayBuffer === "function");
    const dir = resolvePublicUploadEntityDir(LISTING_UPLOAD_CATEGORY, safeId);
    const uploadResult = await saveEntityUploadFiles(files, {
      profile: "image",
      maxSizeMb: MAX_SIZE_MB,
      maxFiles: MAX_FILES,
      dir,
      buildUrl: (safeName) => publicUploadUrlPath(LISTING_UPLOAD_CATEGORY, safeId, safeName),
    });
    if (!uploadResult.ok) {
      return NextResponse.json({ error: uploadResult.error }, { status: uploadResult.status || 400 });
    }

    const urls = uploadResult.attachments.map((a) => a.url);
    return NextResponse.json({ ok: true, urls });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
