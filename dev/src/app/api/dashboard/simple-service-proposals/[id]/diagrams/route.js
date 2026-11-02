import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
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

function readJobDiagrams(doc) {
  return normalizeJobDiagrams(doc?.jobDiagrams, doc?.jobDiagram);
}

function writeJobDiagrams(doc, diagrams) {
  const list = normalizeJobDiagrams(diagrams);
  doc.set("jobDiagrams", list);
  // Keep legacy singular field in sync (first diagram or null).
  doc.set("jobDiagram", list[0] || null);
  return list;
}

/** List all job diagrams for a service proposal. */
export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await getParams(context);
    const recordId = sanitizeRecordId(params?.id);
    if (!recordId) {
      return NextResponse.json({ error: "Valid record id required" }, { status: 400 });
    }

    const email = user.email.trim().toLowerCase();
    await connectDB();
    const doc = await SimpleServiceProposal.findOne({ _id: recordId, createdByEmail: email }).lean();
    if (!doc) return NextResponse.json({ error: "Service proposal not found" }, { status: 404 });

    const jobDiagrams = readJobDiagrams(doc);
    return NextResponse.json({
      jobDiagrams,
      jobDiagram: jobDiagrams[0] || null,
    });
  } catch (err) {
    console.error("Simple SP diagrams list error:", err);
    return NextResponse.json({ error: err.message || "Failed to list diagrams" }, { status: 500 });
  }
}

/** Create a new job diagram (does not replace existing ones). */
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

    const now = new Date().toISOString();
    const entry = normalizeJobDiagram({
      id: newJobDiagramId(),
      url,
      name: documentName || "Job diagram",
      templateId,
      templateName,
      createdAt: now,
      updatedAt: now,
    });

    const next = [...readJobDiagrams(doc), entry];
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
    console.error("Simple SP diagram create error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
