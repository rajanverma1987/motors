import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/**
 * Public shop-settings logo bytes from disk.
 * Used by documents/print on tablets where static /uploads can be stale or unreachable
 * while the authenticated branding preview still works.
 */
export async function GET(_request, context) {
  try {
    const raw = (await context.params) || {};
    const hash = String(raw.hash || "").trim().toLowerCase();
    const file = String(raw.file || "").trim();
    if (!/^[a-f0-9]{24}$/.test(hash)) {
      return new NextResponse(null, { status: 404 });
    }
    if (!/^logo(-[a-zA-Z0-9]+)?\.(png|jpe?g|gif|webp)$/i.test(file)) {
      return new NextResponse(null, { status: 404 });
    }
    const filePath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "shop-settings",
      hash,
      file
    );
    const root = path.join(process.cwd(), "public", "uploads", "shop-settings", hash);
    if (!filePath.startsWith(root) || !existsSync(filePath)) {
      return new NextResponse(null, { status: 404 });
    }
    const buffer = readFileSync(filePath);
    if (!buffer?.length) {
      return new NextResponse(null, { status: 404 });
    }
    const ext = path.extname(file).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || "image/png";
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300, must-revalidate",
        "Content-Disposition": `inline; filename="${file}"`,
      },
    });
  } catch (err) {
    console.error("Public shop logo GET:", err);
    return new NextResponse(null, { status: 500 });
  }
}
