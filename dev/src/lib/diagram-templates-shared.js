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

function newJobDiagramId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `diagram-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function stableDiagramId(jobDiagram) {
  const existing = String(jobDiagram?.id || "").trim();
  if (existing) return existing;
  const url = String(jobDiagram?.url || "").trim();
  const base = url.split("/").pop() || "";
  if (base) return `legacy-${base.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  return newJobDiagramId();
}

/**
 * @param {unknown} jobDiagram
 */
export function normalizeJobDiagram(jobDiagram) {
  if (!jobDiagram || typeof jobDiagram !== "object") return null;
  const url = String(jobDiagram.url || "").trim();
  if (!url) return null;
  return {
    id: stableDiagramId(jobDiagram),
    url,
    name: String(jobDiagram.name || "Job diagram").trim() || "Job diagram",
    templateId: String(jobDiagram.templateId || "").trim(),
    templateName: String(jobDiagram.templateName || "").trim(),
    createdAt: jobDiagram.createdAt || jobDiagram.updatedAt || null,
    updatedAt: jobDiagram.updatedAt || null,
  };
}

/**
 * Normalize job diagrams from `jobDiagrams` array and/or legacy singular `jobDiagram`.
 * @param {unknown} raw
 * @param {unknown} [legacySingular]
 * @returns {Array<{ id: string, url: string, name: string, templateId: string, templateName: string, createdAt: unknown, updatedAt: unknown }>}
 */
export function normalizeJobDiagrams(raw, legacySingular = null) {
  const fromArray = Array.isArray(raw)
    ? raw.map((item) => normalizeJobDiagram(item)).filter(Boolean)
    : [];
  if (fromArray.length) {
    const seen = new Set();
    return fromArray.filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }
  const one = normalizeJobDiagram(legacySingular);
  return one ? [one] : [];
}

/** @param {unknown} diagrams */
export function primaryJobDiagram(diagrams) {
  const list = normalizeJobDiagrams(diagrams);
  return list[0] || null;
}

export { newJobDiagramId };
