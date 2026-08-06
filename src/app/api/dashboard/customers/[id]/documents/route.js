import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "fs";
import path from "path";
import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { clampString, LIMITS } from "@/lib/validation";

const UPLOAD_DIR = "public/uploads/customers";
const MAX_FILES = 20;
const MAX_SIZE_MB = 10;
const MAX_DOCUMENTS = 50;

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

async function loadOwnedCustomer(user, id) {
  await connectDB();
  return Customer.findOne({
    _id: id,
    createdByEmail: user.email.trim().toLowerCase(),
  });
}

export async function POST(request, context) {
  const { allowed } = checkRateLimit(request, "customers-documents", 30);
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
    }
    const doc = await loadOwnedCustomer(user, id);
    if (!doc) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((f) => f && typeof f.arrayBuffer === "function");
    const names = formData.getAll("documentNames").map((n) => String(n ?? "").trim());
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} files per upload` }, { status: 400 });
    }

    const dir = path.join(process.cwd(), UPLOAD_DIR, id);
    mkdirSync(dir, { recursive: true });

    const documents = Array.isArray(doc.documents) ? doc.documents.map((d) => ({ ...d })) : [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length > MAX_SIZE_MB * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds ${MAX_SIZE_MB}MB` },
          { status: 400 }
        );
      }
      const ext = path.extname(file.name || "") || "";
      const safeName = `${Date.now()}-${i}${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = path.join(dir, safeName);
      writeFileSync(filePath, buffer);
      const url = `/uploads/customers/${id}/${safeName}`;
      const name =
        clampString(names[i] || file.name || safeName, LIMITS.name.max) || safeName;
      documents.push({ url, name });
    }

    doc.documents = documents.slice(-MAX_DOCUMENTS);
    doc.markModified("documents");
    await doc.save();

    return NextResponse.json({
      ok: true,
      documents: doc.documents,
    });
  } catch (err) {
    console.error("Customer document upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const { allowed } = checkRateLimit(request, "customers-documents-delete", 40);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const url = String(body?.url || "").trim();
    if (!url) {
      return NextResponse.json({ error: "Document url is required" }, { status: 400 });
    }

    const doc = await loadOwnedCustomer(user, id);
    if (!doc) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const documents = Array.isArray(doc.documents) ? doc.documents.map((d) => ({ ...d })) : [];
    const next = documents.filter((d) => String(d?.url || "").trim() !== url);
    if (next.length === documents.length) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Remove file from disk when it lives under our uploads folder.
    if (url.startsWith(`/uploads/customers/${id}/`)) {
      const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch {
          /* ignore disk errors; DB row still removed */
        }
      }
    }

    doc.documents = next;
    doc.markModified("documents");
    await doc.save();

    return NextResponse.json({ ok: true, documents: doc.documents });
  } catch (err) {
    console.error("Customer document delete error:", err);
    return NextResponse.json({ error: err.message || "Delete failed" }, { status: 500 });
  }
}
