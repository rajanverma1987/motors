import { createHash } from "crypto";
import path from "path";
import { unlinkSync, existsSync } from "fs";
import {
  publicUploadUrlPath,
  resolvePublicUploadEntityDir,
  resolvePublicUploadFilePath,
  writeFileInUploadDir,
} from "@/lib/public-upload-fs";
import {
  DIAGRAM_SCOPE_PLATFORM,
  DIAGRAM_SCOPE_SHOP,
  serializeDiagramTemplate,
  normalizeJobDiagram,
} from "@/lib/diagram-templates-shared";

export {
  DIAGRAM_SCOPE_PLATFORM,
  DIAGRAM_SCOPE_SHOP,
  serializeDiagramTemplate,
  normalizeJobDiagram,
};

const MAX_IMAGE_MB = 8;
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export function ownerDirKey(email) {
  return createHash("sha256")
    .update(String(email || "").trim().toLowerCase())
    .digest("hex")
    .slice(0, 24);
}

/**
 * @param {string} fileName
 */
export function diagramImageExt(fileName) {
  const ext = path.extname(String(fileName || "")).toLowerCase();
  return ALLOWED_EXT.has(ext) ? ext : "";
}

/**
 * @param {Buffer} buffer
 * @param {string} originalName
 * @param {{ scope: string, ownerEmail?: string }} opts
 */
export function saveDiagramTemplateImage(buffer, originalName, opts) {
  if (!buffer?.length) throw new Error("No file provided");
  if (buffer.length > MAX_IMAGE_MB * 1024 * 1024) {
    throw new Error(`Image exceeds ${MAX_IMAGE_MB}MB`);
  }
  const ext = diagramImageExt(originalName) || ".png";
  const scope = String(opts?.scope || DIAGRAM_SCOPE_PLATFORM);
  const fileName = `${Date.now()}${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (scope === DIAGRAM_SCOPE_SHOP) {
    const ownerKey = ownerDirKey(opts.ownerEmail);
    if (!ownerKey) throw new Error("Shop email required");
    const entityId = `shop-${ownerKey}`;
    const absDir = resolvePublicUploadEntityDir("diagram-templates", entityId);
    writeFileInUploadDir(absDir, fileName, buffer);
    return publicUploadUrlPath("diagram-templates", entityId, fileName);
  }

  const absDir = resolvePublicUploadEntityDir("diagram-templates", "platform");
  writeFileInUploadDir(absDir, fileName, buffer);
  return publicUploadUrlPath("diagram-templates", "platform", fileName);
}

/**
 * Best-effort delete of a public /uploads/... file under diagram-templates.
 * @param {string} url
 */
export function tryDeleteDiagramTemplateFile(url) {
  const raw = String(url || "").trim();
  if (!raw.startsWith("/uploads/diagram-templates/")) return;
  const parts = raw.replace(/^\/uploads\//, "").split("/").filter(Boolean);
  const abs = resolvePublicUploadFilePath(parts);
  if (!abs || !existsSync(abs)) return;
  try {
    unlinkSync(abs);
  } catch {
    /* ignore */
  }
}
