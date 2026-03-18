import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveUploadedLogoFile } from "@/lib/logo-upload";

export async function POST(request) {
  const { allowed } = checkRateLimit(request, "upload-logo", 15);
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const url = await saveUploadedLogoFile(file);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("Logo upload error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
