import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { safePdfFilename } from "@/lib/simple-send-document-pdf";
import { buildDatasheetPdfBuffer } from "@/lib/simple-datasheet-pdf";

function shopCompanyNameFromUser(user) {
  return (user.shopName && String(user.shopName).trim()) || process.env.MOTOR_SHOP_COMPANY_NAME?.trim() || "";
}

/**
 * POST: Generate and download the AC / DC Motor Datasheet & Inspection Report PDF.
 */
export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const motorType = String(body?.motorType || "AC").toUpperCase() === "DC" ? "DC" : "AC";
    const datasheet = body?.datasheet && typeof body.datasheet === "object" ? body.datasheet : {};
    const printContext = body?.printContext && typeof body.printContext === "object" ? body.printContext : {};
    const technicianLabel = String(body?.technicianLabel || "").trim();
    const jobDiagrams = Array.isArray(body?.jobDiagrams) ? body.jobDiagrams : [];
    const attachments = Array.isArray(body?.attachments) ? body.attachments : [];

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const uSettings = mergeUserSettings(settingsDoc?.settings);
    const shopCompanyName = shopCompanyNameFromUser(user);

    const pdfBuffer = await buildDatasheetPdfBuffer({
      motorType,
      datasheet,
      printContext,
      technicianLabel,
      jobDiagrams,
      attachments,
      shopName: shopCompanyName,
      ownerEmail: email,
      settings: uSettings,
    });

    const docNumber = String(printContext.documentNumber || datasheet?.jobNumber || "").trim();
    const filename = safePdfFilename(`${motorType}-Datasheet-Report`, docNumber || "Report");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Simple datasheet PDF download error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate PDF" }, { status: 500 });
  }
}
