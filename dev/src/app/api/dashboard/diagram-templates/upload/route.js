import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { DIAGRAM_SCOPE_SHOP, saveDiagramTemplateImage } from "@/lib/diagram-templates";

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "dashboard-diagram-template-upload", 30);
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = saveDiagramTemplateImage(buffer, file.name || "diagram.png", {
      scope: DIAGRAM_SCOPE_SHOP,
      ownerEmail: user.email,
    });
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("Dashboard diagram template upload:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 400 });
  }
}
