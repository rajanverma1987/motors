import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { connectDB } from "@/lib/db";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { clampString, LIMITS } from "@/lib/validation";
import { isValidSimplePortalId, serializeSimplePortalDoc } from "@/lib/simple-portal-mongo";
import {
  newJobDiagramId,
  normalizeJobDiagram,
  normalizeJobDiagrams,
} from "@/lib/diagram-templates";

const UPLOAD_ROOT = "public/uploads/simple-service-proposals";
const MAX_SIZE_MB = 10;

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function ownerDirKey(email) {
  return createHash("sha256")
    .update(String(email || "").trim().toLowerCase())
    .digest("hex")
    .slice(0, 24);
}

function sanitizeRecordId(raw) {
  const id = String(raw || "").trim();
  if (isValidSimplePortalId(id)) return id;
  return "";
}

function resolveDiagramFilePath(url, ownerKey, recordId) {
  const raw = String(url || "").trim();
  const prefix = `/uploads/simple-service-proposals/${ownerKey}/${recordId}/diagrams/`;
  if (!raw.startsWith(prefix)) return null;
  const fileName = raw.slice(prefix.length);
  if (!fileName || fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return null;
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) return null;
  const absDir = path.resolve(process.cwd(), UPLOAD_ROOT, ownerKey, recordId, "diagrams");
  const absFile = path.resolve(absDir, fileName);
  if (!absFile.startsWith(absDir + path.sep) && absFile !== absDir) return null;
  return absFile;
}

function readJobDiagrams(doc) {
  return normalizeJobDiagrams(doc?.jobDiagrams, doc?.jobDiagram);
}

function writeJobDiagrams(doc, diagrams) {
  const list = normalizeJobDiagrams(diagrams);
  doc.set("jobDiagrams", list);
  doc.set("jobDiagram", list[0] || null);
  return list;
}

function unlinkDiagramFile(url, ownerKey, recordId) {
  const prevPath = resolveDiagramFilePath(url, ownerKey, recordId);
  if (prevPath && existsSync(prevPath)) {
    try {
      unlinkSync(prevPath);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Legacy endpoint: create or replace a diagram.
 * Prefer /diagrams (create) and /diagrams/:diagramId (replace/delete).
 * Form field `diagramId` replaces that entry; otherwise appends a new diagram.
 */
export async function POST(request, context) {
  const { allowed } = await checkRateLimit(request, "simple-sp-diagram-upload", 30);
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await getParams(context);
    const recordId = sanitizeRecordId(params?.id);
    if (!recordId) {
      return NextResponse.json({ error: "Valid record id required" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File exceeds ${MAX_SIZE_MB}MB` }, { status: 400 });
    }

    const diagramId = clampString(String(formData.get("diagramId") ?? ""), 80);
    const templateId = clampString(String(formData.get("templateId") ?? ""), 80);
    const templateName = clampString(
      String(formData.get("templateName") ?? ""),
      LIMITS.name?.max || 200
    );
    const documentName = clampString(
      String(formData.get("documentName") ?? ""),
      LIMITS.name?.max || 200
    );

    const email = user.email.trim().toLowerCase();
    const ownerKey = ownerDirKey(email);
    const dir = path.join(process.cwd(), UPLOAD_ROOT, ownerKey, recordId, "diagrams");
    mkdirSync(dir, { recursive: true });

    const safeName = `${Date.now()}.png`.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(dir, safeName);
    writeFileSync(filePath, buffer);
    const url = `/uploads/simple-service-proposals/${ownerKey}/${recordId}/diagrams/${safeName}`;

    await connectDB();
    const doc = await SimpleServiceProposal.findOne({ _id: recordId, createdByEmail: email });
    if (!doc) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });

    const current = readJobDiagrams(doc);
    const now = new Date().toISOString();
    let entry;
    let next;

    if (diagramId) {
      const idx = current.findIndex((d) => d.id === diagramId);
      if (idx < 0) {
        return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
      }
      unlinkDiagramFile(current[idx].url, ownerKey, recordId);
      entry = normalizeJobDiagram({
        ...current[idx],
        id: diagramId,
        url,
        name: documentName || current[idx].name || "Job diagram",
        templateId: templateId || current[idx].templateId || "",
        templateName: templateName || current[idx].templateName || "",
        createdAt: current[idx].createdAt || current[idx].updatedAt || now,
        updatedAt: now,
      });
      next = [...current];
      next[idx] = entry;
    } else {
      entry = normalizeJobDiagram({
        id: newJobDiagramId(),
        url,
        name: documentName || "Job diagram",
        templateId,
        templateName,
        createdAt: now,
        updatedAt: now,
      });
      next = [...current, entry];
    }

    const jobDiagrams = writeJobDiagrams(doc, next);
    await doc.save();

    return NextResponse.json({
      ok: true,
      diagram: entry,
      jobDiagrams,
      jobDiagram: jobDiagrams[0] || null,
      item: serializeSimplePortalDoc(doc),
    });
  } catch (err) {
    console.error("Simple SP diagram upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

/**
 * Legacy delete: `?diagramId=` removes one diagram; without it removes all.
 */
export async function DELETE(request, context) {
  const { allowed } = await checkRateLimit(request, "simple-sp-diagram-delete", 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await getParams(context);
    const recordId = sanitizeRecordId(params?.id);
    if (!recordId) {
      return NextResponse.json({ error: "Valid record id required" }, { status: 400 });
    }

    const email = user.email.trim().toLowerCase();
    const ownerKey = ownerDirKey(email);
    const url = new URL(request.url);
    const diagramId = String(url.searchParams.get("diagramId") || "").trim();

    await connectDB();
    const doc = await SimpleServiceProposal.findOne({ _id: recordId, createdByEmail: email });
    if (!doc) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });

    const current = readJobDiagrams(doc);
    let next;
    if (diagramId) {
      const target = current.find((d) => d.id === diagramId);
      if (!target) {
        return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
      }
      unlinkDiagramFile(target.url, ownerKey, recordId);
      next = current.filter((d) => d.id !== diagramId);
    } else {
      for (const d of current) {
        unlinkDiagramFile(d.url, ownerKey, recordId);
      }
      next = [];
    }

    const jobDiagrams = writeJobDiagrams(doc, next);
    await doc.save();

    return NextResponse.json({
      ok: true,
      jobDiagrams,
      jobDiagram: jobDiagrams[0] || null,
      item: serializeSimplePortalDoc(doc),
    });
  } catch (err) {
    console.error("Simple SP diagram delete error:", err);
    return NextResponse.json({ error: err.message || "Delete failed" }, { status: 500 });
  }
}
