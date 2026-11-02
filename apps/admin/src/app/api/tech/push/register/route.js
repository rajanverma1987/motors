import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import { getTechnicianFromRequest } from "@/lib/auth-portal";

const MAX_TOKENS = 12;
const MAX_TOKEN_LEN = 512;

/**
 * Register Expo push token for the signed-in technician (one or more devices).
 * POST body: { expoPushToken: string }
 */
export async function POST(request) {
  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const tokenStr = String(body.expoPushToken || "").trim();
    if (!tokenStr || tokenStr.length < 20 || tokenStr.length > MAX_TOKEN_LEN) {
      return NextResponse.json({ error: "Valid expoPushToken required" }, { status: 400 });
    }

    await connectDB();
    const emp = await Employee.findOne({
      _id: tech.employeeId,
      createdByEmail: tech.shopEmail,
      technicianAppAccess: true,
    });
    if (!emp) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await Employee.updateMany(
      { createdByEmail: tech.shopEmail, _id: { $ne: emp._id } },
      { $pull: { expoPushTokens: { token: tokenStr } } }
    );

    const arr = Array.isArray(emp.expoPushTokens) ? emp.expoPushTokens.map((x) => ({ ...x })) : [];
    const filtered = arr.filter((x) => x && x.token !== tokenStr);
    filtered.push({ token: tokenStr, updatedAt: new Date() });
    emp.expoPushTokens = filtered.slice(-MAX_TOKENS);
    emp.markModified("expoPushTokens");
    await emp.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Tech push register:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
