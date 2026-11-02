import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { DIAGRAM_SCOPE_PLATFORM, saveDiagramTemplateImage } from "@/lib/diagram-templates";

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "admin-diagram-template-upload", 30);
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = saveDiagramTemplateImage(buffer, file.name || "diagram.png", {
      scope: DIAGRAM_SCOPE_PLATFORM,
    });
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("Admin diagram template upload:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 400 });
  }
}
