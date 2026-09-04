/** Client-safe diagram helpers (no Node fs/crypto). */

export const DIAGRAM_SCOPE_PLATFORM = "platform";
export const DIAGRAM_SCOPE_SHOP = "shop";

/**
 * @param {Record<string, unknown>} doc
 */
export function serializeDiagramTemplate(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id || doc.id || ""),
    scope: String(doc.scope || DIAGRAM_SCOPE_PLATFORM),
    name: String(doc.name || "").trim(),
    description: String(doc.description || "").trim(),
    imageUrl: String(doc.imageUrl || "").trim(),
    createdByEmail: String(doc.createdByEmail || "").trim().toLowerCase(),
    isActive: doc.isActive !== false,
    sortOrder: Number(doc.sortOrder) || 0,
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
  };
}

/**
 * @param {unknown} jobDiagram
 */
export function normalizeJobDiagram(jobDiagram) {
  if (!jobDiagram || typeof jobDiagram !== "object") return null;
  const url = String(jobDiagram.url || "").trim();
  if (!url) return null;
  return {
    url,
    name: String(jobDiagram.name || "Job diagram").trim() || "Job diagram",
    templateId: String(jobDiagram.templateId || "").trim(),
    templateName: String(jobDiagram.templateName || "").trim(),
    updatedAt: jobDiagram.updatedAt || null,
  };
}
