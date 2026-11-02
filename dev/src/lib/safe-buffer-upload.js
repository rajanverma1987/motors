import path from "path";
import { mkdirSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { readValidatedUploadFile, validateUploadBuffer, buildSafeUploadFileName } from "@/lib/upload-security";

/**
 * Validate buffer and write to disk; returns site-relative URL path.
 * @param {Buffer} buffer
 * @param {string} originalName
 * @param {object} options
 * @param {"image"|"document"} [options.profile="image"]
 * @param {number} [options.maxBytes]
 * @param {string} options.uploadDir - relative dir under cwd, e.g. public/uploads/support
 * @param {string} options.urlPrefix - e.g. /uploads/support
 */
export function saveValidatedBufferUpload(buffer, originalName, options) {
  const profile = options.profile || "image";
  const maxBytes = options.maxBytes || 8 * 1024 * 1024;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Invalid file");
  }
  if (buffer.length > maxBytes) {
    throw new Error(`File must be under ${Math.round(maxBytes / 1024 / 1024)}MB`);
  }
  const validation = validateUploadBuffer(buffer, originalName || "", "", profile);
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  const id = randomBytes(8).toString("hex");
  const safeName = `${Date.now()}-${id}${validation.ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dir = path.join(process.cwd(), options.uploadDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, safeName), buffer);
  return `${options.urlPrefix}/${safeName}`;
}

/**
 * Process multiple FormData files for entity attachments.
 * @param {File[]} files
 * @param {object} options
 */
export async function saveEntityUploadFiles(files, options) {
  const {
    profile = "document",
    maxSizeMb = 10,
    dir,
    maxFiles = 20,
    buildUrl,
  } = options;

  if (!Array.isArray(files) || files.length === 0) {
    return { ok: false, error: "No files provided", status: 400 };
  }
  if (files.length > maxFiles) {
    return { ok: false, error: `Maximum ${maxFiles} files per upload`, status: 400 };
  }

  const attachments = [];
  for (let i = 0; i < files.length; i++) {
    const validated = await readValidatedUploadFile(files[i], profile);
    if (!validated.ok) {
      return { ok: false, error: validated.error, status: 400 };
    }
    if (validated.buffer.length > maxSizeMb * 1024 * 1024) {
      return {
        ok: false,
        error: `File ${validated.name || "upload"} exceeds ${maxSizeMb}MB`,
        status: 400,
      };
    }
    const safeName = buildSafeUploadFileName(i, validated.ext);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, safeName), validated.buffer);
    const name = (validated.name || safeName).trim() || safeName;
    attachments.push({ url: buildUrl(safeName), name });
  }
  return { ok: true, attachments };
}
