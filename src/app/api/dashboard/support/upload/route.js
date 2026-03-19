import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveSupportTicketImage } from "@/lib/support-ticket-image-upload";

export async function POST(request) {
  const { allowed } = checkRateLimit(request, "dashboard-support-upload", 40);
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = saveSupportTicketImage(buffer, file.name || "screenshot.jpg");
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("Dashboard support upload:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 400 });
  }
}
