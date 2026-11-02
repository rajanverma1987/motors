import path from "path";

/** Extensions never allowed on the platform. */
export const BLOCKED_UPLOAD_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".xhtml",
  ".svg",
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".tsx",
  ".php",
  ".phtml",
  ".asp",
  ".aspx",
  ".exe",
  ".dll",
  ".msi",
  ".bat",
  ".cmd",
  ".com",
  ".scr",
  ".vbs",
  ".ps1",
  ".sh",
  ".bash",
  ".jar",
  ".hta",
  ".wasm",
  ".json",
  ".xml",
]);

export const UPLOAD_PROFILES = {
  image: {
    extensions: new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]),
    mimeTypes: new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]),
    requireMagic: true,
  },
  document: {
    extensions: new Set([
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".csv",
      ".txt",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".tif",
      ".tiff",
    ]),
    mimeTypes: new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "text/plain",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/tiff",
    ]),
    requireMagic: false,
  },
};

function readMagic(buffer, len = 12) {
  return buffer.subarray(0, Math.min(len, buffer.length));
}

function matchesMagic(buffer, bytes) {
  if (buffer.length < bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[i] !== bytes[i]) return false;
  }
  return true;
}

/**
 * Detect file type from magic bytes.
 * @param {Buffer} buffer
 * @returns {"jpeg"|"png"|"gif"|"webp"|"pdf"|"zip"|null}
 */
export function detectMagicType(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (matchesMagic(buffer, [0xff, 0xd8, 0xff])) return "jpeg";
  if (matchesMagic(buffer, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (matchesMagic(buffer, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  if (buffer.subarray(0, 4).toString("ascii") === "%PDF") return "pdf";
  if (matchesMagic(buffer, [0x50, 0x4b, 0x03, 0x04])) return "zip";
  return null;
}

const MAGIC_TO_EXT = {
  jpeg: ".jpg",
  png: ".png",
  gif: ".gif",
  webp: ".webp",
  pdf: ".pdf",
  zip: ".zip",
};

/**
 * Normalize and validate extension from filename (blocks double extensions).
 * @param {string} fileName
 */
export function getSafeUploadExtension(fileName) {
  const base = path.basename(String(fileName || ""));
  const parts = base.toLowerCase().split(".").filter(Boolean);
  if (parts.length < 2) return "";
  const ext = `.${parts[parts.length - 1]}`;
  if (BLOCKED_UPLOAD_EXTENSIONS.has(ext)) return "";
  for (let i = 1; i < parts.length; i++) {
    const segmentExt = `.${parts[i]}`;
    if (BLOCKED_UPLOAD_EXTENSIONS.has(segmentExt)) return "";
  }
  return ext;
}

/**
 * @param {Buffer} buffer
 * @param {string} fileName
 * @param {string} [declaredMime]
 * @param {"image"|"document"} [profile="document"]
 * @returns {{ ok: true, ext: string, magicType: string | null } | { ok: false, error: string }}
 */
export function validateUploadBuffer(buffer, fileName, declaredMime = "", profile = "document") {
  const cfg = UPLOAD_PROFILES[profile] || UPLOAD_PROFILES.document;
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { ok: false, error: "Empty file." };
  }

  const ext = getSafeUploadExtension(fileName);
  if (!ext) {
    return { ok: false, error: "File type not allowed." };
  }
  if (BLOCKED_UPLOAD_EXTENSIONS.has(ext)) {
    return { ok: false, error: "This file type is not allowed." };
  }
  if (!cfg.extensions.has(ext)) {
    return { ok: false, error: "File type not allowed for this upload." };
  }

  const mime = String(declaredMime || "").toLowerCase().trim();
  if (mime && cfg.mimeTypes.size > 0 && !cfg.mimeTypes.has(mime)) {
    return { ok: false, error: "File MIME type not allowed." };
  }

  const magicType = detectMagicType(buffer);
  if (cfg.requireMagic) {
    if (!magicType || !["jpeg", "png", "gif", "webp"].includes(magicType)) {
      return { ok: false, error: "Invalid image file content." };
    }
    const magicExt = MAGIC_TO_EXT[magicType];
    const imageExts = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
    if (magicExt && imageExts.has(ext) && magicExt !== ext && !(magicType === "jpeg" && ext === ".jpeg")) {
      return { ok: false, error: "File content does not match its extension." };
    }
    return { ok: true, ext: magicExt || ext, magicType };
  }

  if (ext === ".pdf" && magicType && magicType !== "pdf") {
    return { ok: false, error: "File content does not match PDF extension." };
  }
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) && magicType) {
    const expected = ext === ".jpeg" ? "jpeg" : ext.slice(1);
    if (magicType !== expected) {
      return { ok: false, error: "File content does not match its extension." };
    }
  }

  return { ok: true, ext, magicType };
}

/**
 * Read and validate a Web API File from FormData.
 * @param {File} file
 * @param {"image"|"document"} [profile="document"]
 */
export async function readValidatedUploadFile(file, profile = "document") {
  if (!file || typeof file.arrayBuffer !== "function") {
    return { ok: false, error: "No file provided." };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = validateUploadBuffer(buffer, file.name || "", file.type || "", profile);
  if (!result.ok) return result;
  return { ok: true, buffer, ext: result.ext, magicType: result.magicType, name: file.name || "" };
}

/**
 * Build a safe stored file name.
 * @param {number} index
 * @param {string} ext
 */
export function buildSafeUploadFileName(index, ext) {
  const safeExt = ext.startsWith(".") ? ext : `.${ext}`;
  return `${Date.now()}-${index}${safeExt}`.replace(/[^a-zA-Z0-9._-]/g, "_");
}
