import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

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

function safeUploadsPath(parts) {
  const cleaned = (Array.isArray(parts) ? parts : [])
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  if (!cleaned.length) return null;
  if (cleaned.some((p) => p.includes("..") || p.includes("\\"))) return null;
  const resolved = path.resolve(process.cwd(), "public", "uploads", ...cleaned);
  const root = path.resolve(process.cwd(), "public", "uploads");
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

export async function GET(request, context) {
  try {
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const filePath = safeUploadsPath(params?.path);
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

