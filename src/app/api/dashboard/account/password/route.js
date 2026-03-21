import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getPortalUserFromRequest, hashPassword, verifyPassword } from "@/lib/auth-portal";
import { LIMITS } from "@/lib/validation";

/**
 * POST: Change portal password (Settings → Account → Password).
 * Body: { currentPassword, newPassword }
 */
export async function POST(request) {
  try {
    const portal = await getPortalUserFromRequest(request);
    if (!portal?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current password and new password are required." }, { status: 400 });
    }
    if (newPassword.length < LIMITS.password.min || newPassword.length > LIMITS.password.max) {
      return NextResponse.json(
        { error: `New password must be between ${LIMITS.password.min} and ${LIMITS.password.max} characters.` },
        { status: 400 }
      );
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: "New password must be different from the current password." }, { status: 400 });
    }

    await connectDB();
    const email = portal.email.trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST dashboard account password:", err);
    return NextResponse.json({ error: err.message || "Failed to update password" }, { status: 500 });
  }
}
