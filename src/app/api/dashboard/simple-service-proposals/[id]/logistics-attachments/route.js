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
  KIND_RECEIVING,
  KIND_SHIPPING,
  normalizeMotorLogisticsRecord,
} from "@/lib/simple-motor-logistics";

const UPLOAD_ROOT = "public/uploads/simple-service-proposals";
const MAX_SIZE_MB = 10;
const MAX_ATTACHMENTS = 50;

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function sanitizeRecordId(raw) {
  const id = String(raw || "").trim();
  if (isValidSimplePortalId(id)) return id;
  return "";
}

function ownerDirKey(email) {
  return createHash("sha256").update(String(email || "").trim().toLowerCase()).digest("hex").slice(0, 24);
}

function resolveKind(raw) {
  const k = String(raw || "").trim();
  if (k === KIND_SHIPPING || k === "shipping" || k === "motor_shipping") return KIND_SHIPPING;
  if (k === KIND_RECEIVING || k === "receiving" || k === "motor_receiving") return KIND_RECEIVING;
  return "";
}

function motorKeyForKind(kind) {
  return kind === KIND_SHIPPING ? "motorShipping" : "motorReceiving";
}

function folderForKind(kind) {
  return kind === KIND_SHIPPING ? "motor-shipping" : "motor-receiving";
}

function resolveOwnedFilePath(url, ownerKey, recordId, kind) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  const prefix = `/uploads/simple-service-proposals/${ownerKey}/${recordId}/${folderForKind(kind)}/`;
  if (!raw.startsWith(prefix)) return null;
  const fileName = raw.slice(prefix.length);
  if (!fileName || fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return null;
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) return null;
  const absDir = path.resolve(process.cwd(), UPLOAD_ROOT, ownerKey, recordId, folderForKind(kind));
  const absFile = path.resolve(absDir, fileName);
  if (!absFile.startsWith(absDir + path.sep) && absFile !== absDir) return null;
  return absFile;
}

/** Upload an attachment onto motorReceiving or motorShipping on a saved Simple SP. */
export async function POST(request, context) {
  const { allowed } = await checkRateLimit(request, "simple-sp-logistics-upload", 30);
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
    const kind = resolveKind(formData.get("kind"));
    if (!kind) {
      return NextResponse.json({ error: "kind must be receiving or shipping" }, { status: 400 });
    }
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const documentName = clampString(String(formData.get("documentName") ?? ""), LIMITS.name?.max || 200);

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File exceeds ${MAX_SIZE_MB}MB` }, { status: 400 });
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await SimpleServiceProposal.findOne({ _id: recordId, createdByEmail: email });
    if (!doc) {
      return NextResponse.json({ error: "Service proposal not found" }, { status: 404 });
    }

    const motorKey = motorKeyForKind(kind);
    const current = normalizeMotorLogisticsRecord(doc.get(motorKey), kind, {
      jobNumber: String(doc.documentNumber || "").trim(),
      invoiceNumber: String(doc.documentNumber || "").trim(),
    });
    if (current.attachments.length >= MAX_ATTACHMENTS) {
      return NextResponse.json({ error: `Maximum ${MAX_ATTACHMENTS} attachments` }, { status: 400 });
    }

    const ownerKey = ownerDirKey(user.email);
    const dir = path.join(process.cwd(), UPLOAD_ROOT, ownerKey, recordId, folderForKind(kind));
    mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.name || "") || "";
    const safeName = `${Date.now()}${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
    writeFileSync(path.join(dir, safeName), buffer);

    const url = `/uploads/simple-service-proposals/${ownerKey}/${recordId}/${folderForKind(kind)}/${safeName}`;
    const name = (documentName || file.name || safeName).trim() || safeName;
    const attachment = { url, name };
    const nextRecord = {
      ...current,
      attachments: [...current.attachments, attachment],
      updatedAt: new Date().toISOString(),
    };
    doc.set(motorKey, nextRecord);
    doc.markModified(motorKey);
    await doc.save();

    return NextResponse.json({
      ok: true,
      attachment,
      attachments: nextRecord.attachments,
      record: nextRecord,
      item: serializeSimplePortalDoc(doc),
      maxAttachments: MAX_ATTACHMENTS,
    });
  } catch (err) {
    console.error("Simple logistics attachment upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

/** Delete a receiving/shipping attachment file and remove it from the SP record. */
export async function DELETE(request, context) {
  const { allowed } = await checkRateLimit(request, "simple-sp-logistics-delete-attachment", 60);
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
    const kind = resolveKind(body?.kind);
    const url = String(body?.url || "").trim();
    if (!kind) {
      return NextResponse.json({ error: "kind must be receiving or shipping" }, { status: 400 });
    }
    if (!url) {
      return NextResponse.json({ error: "Attachment url required" }, { status: 400 });
    }

    const ownerKey = ownerDirKey(user.email);
    const filePath = resolveOwnedFilePath(url, ownerKey, recordId, kind);
    if (!filePath) {
      return NextResponse.json({ error: "Invalid attachment url" }, { status: 400 });
    }
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await SimpleServiceProposal.findOne({ _id: recordId, createdByEmail: email });
    if (!doc) {
      return NextResponse.json({ error: "Service proposal not found" }, { status: 404 });
    }

    const motorKey = motorKeyForKind(kind);
    const current = normalizeMotorLogisticsRecord(doc.get(motorKey), kind, {
      jobNumber: String(doc.documentNumber || "").trim(),
      invoiceNumber: String(doc.documentNumber || "").trim(),
    });
    const nextRecord = {
      ...current,
      attachments: current.attachments.filter((a) => String(a?.url || "").trim() !== url),
      updatedAt: new Date().toISOString(),
    };
    doc.set(motorKey, nextRecord);
    doc.markModified(motorKey);
    await doc.save();

    return NextResponse.json({
      ok: true,
      attachments: nextRecord.attachments,
      record: nextRecord,
      item: serializeSimplePortalDoc(doc),
    });
  } catch (err) {
    console.error("Simple logistics attachment delete error:", err);
    return NextResponse.json({ error: err.message || "Delete failed" }, { status: 500 });
  }
}
