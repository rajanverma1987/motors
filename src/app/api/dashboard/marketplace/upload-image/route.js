import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveMarketplaceListingImage } from "@/lib/marketplace-image-upload";

export async function POST(request) {
  const { allowed } = checkRateLimit(request, "dashboard-mp-upload", 30);
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
    const url = saveMarketplaceListingImage(buffer, file.name || "photo.jpg");
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("Dashboard marketplace upload:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 400 });
  }
}
