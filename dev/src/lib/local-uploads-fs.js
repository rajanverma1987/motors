import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

export const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
export const WORK_ORDER_UPLOADS_DIR = path.join(PUBLIC_UPLOADS_DIR, "work-orders");

/** Resolve a work-order photo file from its public URL. */
export function resolveWorkOrderPhotoFile(woId, url) {
  const wo = String(woId || "").trim();
  const u = String(url || "").trim();
  const prefix = `/uploads/work-orders/${wo}/`;
  if (!wo || !u.startsWith(prefix) || u.includes("..")) return null;

  const rel = u.replace(/^\//, "");
  const full = path.resolve(path.join(process.cwd(), "public", rel));
  const allowedDir = path.resolve(path.join(WORK_ORDER_UPLOADS_DIR, wo));
  if (!full.startsWith(`${allowedDir}${path.sep}`)) return null;
  return full;
}

export async function ensureWorkOrderPhotoDir(woId) {
  const dir = path.join(WORK_ORDER_UPLOADS_DIR, String(woId || "").trim());
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeWorkOrderPhotoFile(woId, safeName, buffer) {
  const dir = await ensureWorkOrderPhotoDir(woId);
  const filePath = path.join(dir, safeName);
  await writeFile(filePath, buffer);
  return filePath;
}

/** Delete file when present; ignore missing files. */
export async function deleteLocalFileIfExists(filePath) {
  if (!filePath) return false;
  try {
    await unlink(filePath);
    return true;
  } catch (err) {
    if (err?.code === "ENOENT") return false;
    throw err;
  }
}
