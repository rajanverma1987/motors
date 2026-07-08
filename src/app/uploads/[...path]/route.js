import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { resolvePublicUploadFilePath } from "@/lib/public-upload-fs";

/** Always read from disk so runtime uploads are visible without restarting the server. */
export const dynamic = "force-dynamic";

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".pdf": "application/pdf",
};

export async function GET(request, context) {
  try {
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const filePath = resolvePublicUploadFilePath(params?.path);
    if (!filePath) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const buf = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || "application/octet-stream";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
