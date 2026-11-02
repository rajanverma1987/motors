import { saveValidatedBufferUpload } from "@/lib/safe-buffer-upload";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Write a support ticket attachment and return a site-relative URL path.
 * @param {Buffer} buffer
 * @param {string} [originalName]
 * @returns {string} e.g. /uploads/support/1739-abc.jpg
 */
export function saveSupportTicketImage(buffer, originalName = "photo.jpg") {
  return saveValidatedBufferUpload(buffer, originalName, {
    profile: "image",
    maxBytes: MAX_BYTES,
    uploadDir: "public/uploads/support",
    urlPrefix: "/uploads/support",
  });
}
