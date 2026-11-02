import { NextResponse } from "next/server";
import path from "path";
import { connectDB } from "@/lib/db";
import Vendor from "@/models/Vendor";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveEntityUploadFiles } from "@/lib/safe-buffer-upload";

const UPLOAD_DIR = "public/uploads/vendors";
const MAX_FILES = 20;
const MAX_SIZE_MB = 10;
const MAX_ATTACHMENTS = 50;

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function POST(request, context) {
  const { allowed } = await checkRateLimit(request, "vendors-upload", 30);
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
      return NextResponse.json({ error: "Vendor ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Vendor.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    });
    if (!doc) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((f) => f && typeof f.arrayBuffer === "function");
    const dir = path.join(process.cwd(), UPLOAD_DIR, id);
    const uploadResult = await saveEntityUploadFiles(files, {
      profile: "document",
      maxSizeMb: MAX_SIZE_MB,
      maxFiles: MAX_FILES,
      dir,
      buildUrl: (safeName) => `/uploads/vendors/${id}/${safeName}`,
    });
    if (!uploadResult.ok) {
      return NextResponse.json({ error: uploadResult.error }, { status: uploadResult.status || 400 });
    }

    const attachments = Array.isArray(doc.attachments) ? doc.attachments.map((a) => ({ ...a })) : [];
    attachments.push(...uploadResult.attachments);
    doc.attachments = attachments.slice(-MAX_ATTACHMENTS);
    doc.markModified("attachments");
    await doc.save();

    return NextResponse.json({
      ok: true,
      attachments: doc.attachments,
    });
  } catch (err) {
    console.error("Vendor upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
