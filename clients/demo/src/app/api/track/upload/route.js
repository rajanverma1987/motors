import { NextResponse } from "next/server";
import path from "path";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveEntityUploadFiles } from "@/lib/safe-buffer-upload";
import { getTrackFacilityFromRequest, trackUnauthorized } from "@/lib/track-auth";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = "public/uploads/track";
const MAX_FILES = 6;
const MAX_IMAGE_MB = 8;
const MAX_DOC_MB = 12;

export async function POST(request) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });

    const { allowed } = await checkRateLimit(request, "track-upload", 40);
    if (!allowed) {
      return NextResponse.json({ error: "Too many uploads. Try again in a minute." }, { status: 429 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((f) => f && typeof f.arrayBuffer === "function");
    if (files.length === 0) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    const profile = String(formData.get("profile") || "image") === "document" ? "document" : "image";

    const subdir = `${String(facility._id)}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const dir = path.join(process.cwd(), UPLOAD_DIR, subdir);
    const result = await saveEntityUploadFiles(files, {
      profile,
      maxSizeMb: profile === "document" ? MAX_DOC_MB : MAX_IMAGE_MB,
      maxFiles: MAX_FILES,
      dir,
      buildUrl: (safeName) => `/uploads/track/${subdir}/${safeName}`,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({
      ok: true,
      urls: result.attachments.map((a) => a.url),
      attachments: result.attachments,
    });
  } catch (err) {
    console.error("Track upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
