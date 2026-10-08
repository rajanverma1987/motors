import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { sendPayrollSheetNow } from "@/lib/time-clock-payroll-communication";

/** Email the current payroll Excel sheet to the shop notification address. */
export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const result = await sendPayrollSheetNow({ ownerEmail: user.email });
    return NextResponse.json({
      ok: true,
      message: `Payroll sheet for ${result.period} was sent to ${result.email}. Times are in ${result.timeZone}.`,
    });
  } catch (err) {
    console.error("Generate payroll sheet error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to send the payroll sheet." },
      { status: 400 }
    );
  }
}
