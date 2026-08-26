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

const UPLOAD_ROOT = "public/uploads/simple-service-proposals";
const MAX_SIZE_MB = 10;
const MAX_ATTACHMENTS_HINT = 50;

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function sanitizeRecordId(raw) {
  const id = String(raw || "").trim();
  if (isValidSimplePortalId(id)) return id;
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(id)) return "";
  return id;
}

function ownerDirKey(email) {
  return createHash("sha256").update(String(email || "").trim().toLowerCase()).digest("hex").slice(0, 24);
}

function resolveOwnedFilePath(url, ownerKey, recordId) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  const prefix = `/uploads/simple-service-proposals/${ownerKey}/${recordId}/`;
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

/** Upload an attachment for a saved Simple service proposal record. */
export async function POST(request, context) {
  const { allowed } = await checkRateLimit(request, "simple-sp-upload", 30);
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
    const documentName = clampString(String(formData.get("documentName") ?? ""), LIMITS.name?.max || 200);

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File exceeds ${MAX_SIZE_MB}MB` }, { status: 400 });
    }

    const ownerKey = ownerDirKey(user.email);
    const dir = path.join(process.cwd(), UPLOAD_ROOT, ownerKey, recordId);
    mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.name || "") || "";
    const safeName = `${Date.now()}${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = path.join(dir, safeName);
    writeFileSync(filePath, buffer);

    const url = `/uploads/simple-service-proposals/${ownerKey}/${recordId}/${safeName}`;
    const name = (documentName || file.name || safeName).trim() || safeName;
    const attachment = { url, name };

    let item = null;
    if (isValidSimplePortalId(recordId)) {
      await connectDB();
      const email = user.email.trim().toLowerCase();
      const doc = await SimpleServiceProposal.findOne({ _id: recordId, createdByEmail: email });
      if (!doc) {
        return NextResponse.json({ error: "Service proposal not found" }, { status: 404 });
      }
      const existing = Array.isArray(doc.attachments) ? doc.attachments : [];
      doc.set("attachments", [...existing, attachment]);
      await doc.save();
      item = serializeSimplePortalDoc(doc);
    }

    return NextResponse.json({
      ok: true,
      attachment,
      item,
      maxAttachments: MAX_ATTACHMENTS_HINT,
    });
  } catch (err) {
    console.error("Simple service proposal upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

/** Delete an attachment file for a saved Simple service proposal record. */
export async function DELETE(request, context) {
  const { allowed } = await checkRateLimit(request, "simple-sp-delete-attachment", 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const recordId = sanitizeRecordId(params?.id);
    if (!recordId) {
      return NextResponse.json({ error: "Valid record id required" }, { status: 400 });
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

    let item = null;
    if (isValidSimplePortalId(recordId)) {
      await connectDB();
      const email = user.email.trim().toLowerCase();
      const doc = await SimpleServiceProposal.findOne({ _id: recordId, createdByEmail: email });
      if (doc) {
        const existing = Array.isArray(doc.attachments) ? doc.attachments : [];
        doc.set(
          "attachments",
          existing.filter((a) => String(a?.url || "").trim() !== url)
        );
        await doc.save();
        item = serializeSimplePortalDoc(doc);
      }
    }

    return NextResponse.json({ ok: true, item });
  } catch (err) {
    console.error("Simple service proposal attachment delete error:", err);
    return NextResponse.json({ error: err.message || "Delete failed" }, { status: 500 });
  }
}
