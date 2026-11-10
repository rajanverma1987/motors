import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { clampString, LIMITS } from "@/lib/validation";
import { readValidatedUploadFile, buildSafeUploadFileName } from "@/lib/upload-security";
import { isValidSimplePortalId } from "@/lib/simple-portal-mongo";
import { toEmployeeJson } from "@/lib/employee-record";

const UPLOAD_ROOT = "public/uploads/employees";
const MAX_SIZE_MB = 10;
const MAX_ATTACHMENTS = 50;

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function ownerDirKey(email) {
  return createHash("sha256").update(String(email || "").trim().toLowerCase()).digest("hex").slice(0, 24);
}

function resolveOwnedFilePath(url, ownerKey, recordId) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  const prefix = `/uploads/employees/${ownerKey}/${recordId}/`;
  if (!raw.startsWith(prefix)) return null;
  const fileName = raw.slice(prefix.length);
  if (!fileName || fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return null;
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) return null;
  const absDir = path.resolve(process.cwd(), UPLOAD_ROOT, ownerKey, recordId);
  const absFile = path.resolve(absDir, fileName);
  if (!absFile.startsWith(absDir + path.sep) && absFile !== absDir) return null;
  return absFile;
}

export async function POST(request, context) {
  const { allowed } = await checkRateLimit(request, "employee-upload", 30);
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const recordId = String(params?.id || "").trim();
    if (!recordId || !isValidSimplePortalId(recordId)) {
      return NextResponse.json({ error: "Valid employee id required" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const documentName = clampString(String(formData.get("documentName") ?? ""), LIMITS.name?.max || 200);

    const validated = await readValidatedUploadFile(file, "document");
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    if (validated.buffer.length > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File exceeds ${MAX_SIZE_MB}MB` }, { status: 400 });
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await Employee.findOne({ _id: recordId, createdByEmail: email });
    if (!doc) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const existing = Array.isArray(doc.attachments) ? doc.attachments : [];
    if (existing.length >= MAX_ATTACHMENTS) {
      return NextResponse.json({ error: `At most ${MAX_ATTACHMENTS} attachments are allowed.` }, { status: 400 });
    }

    const ownerKey = ownerDirKey(user.email);
    const dir = path.join(process.cwd(), UPLOAD_ROOT, ownerKey, recordId);
    mkdirSync(dir, { recursive: true });

    const safeName = buildSafeUploadFileName(0, validated.ext);
    const filePath = path.join(dir, safeName);
    writeFileSync(filePath, validated.buffer);

    const url = `/uploads/employees/${ownerKey}/${recordId}/${safeName}`;
    const name = (documentName || file.name || safeName).trim() || safeName;
    const attachment = { url, name };
    if (validated.magicType === "pdf") attachment.contentType = "application/pdf";
    else if (file.type) attachment.contentType = String(file.type).slice(0, 120);
    else if (String(validated.ext || "").toLowerCase() === ".pdf") attachment.contentType = "application/pdf";

    doc.set("attachments", [...existing, attachment]);
    await doc.save();

    return NextResponse.json({
      ok: true,
      attachment,
      employee: toEmployeeJson(doc),
      maxAttachments: MAX_ATTACHMENTS,
    });
  } catch (err) {
    console.error("Employee attachment upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const { allowed } = await checkRateLimit(request, "employee-delete-attachment", 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const recordId = String(params?.id || "").trim();
    if (!recordId || !isValidSimplePortalId(recordId)) {
      return NextResponse.json({ error: "Valid employee id required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const url = String(body?.url || "").trim();
    if (!url) {
      return NextResponse.json({ error: "Attachment url required" }, { status: 400 });
    }

    const ownerKey = ownerDirKey(user.email);
    const filePath = resolveOwnedFilePath(url, ownerKey, recordId);
    if (!filePath) {
      return NextResponse.json({ error: "Invalid attachment url" }, { status: 400 });
    }

    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await Employee.findOne({ _id: recordId, createdByEmail: email });
    if (doc) {
      const existing = Array.isArray(doc.attachments) ? doc.attachments : [];
      doc.set(
        "attachments",
        existing.filter((a) => String(a?.url || "").trim() !== url)
      );
      await doc.save();
    }

    return NextResponse.json({
      ok: true,
      employee: doc ? toEmployeeJson(doc) : null,
    });
  } catch (err) {
    console.error("Employee attachment delete error:", err);
    return NextResponse.json({ error: err.message || "Delete failed" }, { status: 500 });
  }
}
