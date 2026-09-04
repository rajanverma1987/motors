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
import { normalizeJobDiagram } from "@/lib/diagram-templates";

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

/** Save or replace the job diagram PNG for a service proposal. */
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

    const previous = normalizeJobDiagram(doc.jobDiagram);
    if (previous?.url) {
      const prevPath = resolveDiagramFilePath(previous.url, ownerKey, recordId);
      if (prevPath && existsSync(prevPath)) {
        try {
          unlinkSync(prevPath);
        } catch {
          /* ignore */
        }
      }
    }

    const jobDiagram = {
      url,
      name: documentName || "Job diagram",
      templateId,
      templateName,
      updatedAt: new Date().toISOString(),
    };
    doc.set("jobDiagram", jobDiagram);
    await doc.save();

    return NextResponse.json({
      ok: true,
      jobDiagram,
      item: serializeSimplePortalDoc(doc),
    });
  } catch (err) {
    console.error("Simple SP diagram upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

/** Remove the saved job diagram. */
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

    await connectDB();
    const doc = await SimpleServiceProposal.findOne({ _id: recordId, createdByEmail: email });
    if (!doc) return NextResponse.json({ error: "Service proposal not found" }, { status: 404 });

    const previous = normalizeJobDiagram(doc.jobDiagram);
    if (previous?.url) {
      const prevPath = resolveDiagramFilePath(previous.url, ownerKey, recordId);
      if (prevPath && existsSync(prevPath)) {
        try {
          unlinkSync(prevPath);
        } catch {
          /* ignore */
        }
      }
    }
    doc.set("jobDiagram", null);
    await doc.save();

    return NextResponse.json({ ok: true, item: serializeSimplePortalDoc(doc) });
  } catch (err) {
    console.error("Simple SP diagram delete error:", err);
    return NextResponse.json({ error: err.message || "Delete failed" }, { status: 500 });
  }
}
