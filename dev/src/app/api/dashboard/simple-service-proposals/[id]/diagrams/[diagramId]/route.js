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
import { normalizeJobDiagram, normalizeJobDiagrams } from "@/lib/diagram-templates";

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

/** Replace an existing job diagram PNG. */
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
    const diagramId = String(params?.diagramId || "").trim();
    if (!recordId) {
      return NextResponse.json({ error: "Valid record id required" }, { status: 400 });
    }
    if (!diagramId) {
      return NextResponse.json({ error: "Valid diagram id required" }, { status: 400 });
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
    if (!doc) return NextResponse.json({ error: "Service proposal not found" }, { status: 404 });

    const current = readJobDiagrams(doc);
    const idx = current.findIndex((d) => d.id === diagramId);
    if (idx < 0) {
      return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
    }

    const previous = current[idx];
    unlinkDiagramFile(previous.url, ownerKey, recordId);

    const now = new Date().toISOString();
    const entry = normalizeJobDiagram({
      ...previous,
      id: diagramId,
      url,
      name: documentName || previous.name || "Job diagram",
      templateId: templateId || previous.templateId || "",
      templateName: templateName || previous.templateName || "",
      createdAt: previous.createdAt || previous.updatedAt || now,
      updatedAt: now,
    });

    const next = [...current];
    next[idx] = entry;
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
    console.error("Simple SP diagram replace error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

/** Delete one job diagram. */
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
    const diagramId = String(params?.diagramId || "").trim();
    if (!recordId) {
      return NextResponse.json({ error: "Valid record id required" }, { status: 400 });
    }
    if (!diagramId) {
      return NextResponse.json({ error: "Valid diagram id required" }, { status: 400 });
    }

    const email = user.email.trim().toLowerCase();
    const ownerKey = ownerDirKey(email);

    await connectDB();
    const doc = await SimpleServiceProposal.findOne({ _id: recordId, createdByEmail: email });
    if (!doc) return NextResponse.json({ error: "Service proposal not found" }, { status: 404 });

    const current = readJobDiagrams(doc);
    const target = current.find((d) => d.id === diagramId);
    if (!target) {
      return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
    }

    unlinkDiagramFile(target.url, ownerKey, recordId);
    const jobDiagrams = writeJobDiagrams(
      doc,
      current.filter((d) => d.id !== diagramId)
    );
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
