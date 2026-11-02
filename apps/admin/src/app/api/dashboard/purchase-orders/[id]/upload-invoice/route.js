import { NextResponse } from "next/server";
import path from "path";
import { mkdirSync, writeFileSync } from "fs";
import { connectDB } from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { readValidatedUploadFile } from "@/lib/upload-security";

const UPLOAD_DIR = "public/uploads/purchase-orders";
const MAX_SIZE_MB = 10;

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function POST(request, context) {
  const { allowed } = await checkRateLimit(request, "po-upload-invoice", 20);
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
      return NextResponse.json({ error: "PO ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await PurchaseOrder.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    });
    if (!doc) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validated = await readValidatedUploadFile(file, "document");
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    if (validated.buffer.length > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `File must be under ${MAX_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    const dir = path.join(process.cwd(), UPLOAD_DIR, id);
    mkdirSync(dir, { recursive: true });

    const safeName = `${Date.now()}${validated.ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
    writeFileSync(path.join(dir, safeName), validated.buffer);

    const url = `/uploads/purchase-orders/${id}/${safeName}`;
    const name = (validated.name || safeName).trim() || safeName;
    return NextResponse.json({ ok: true, url, name });
  } catch (err) {
    console.error("PO upload invoice error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
