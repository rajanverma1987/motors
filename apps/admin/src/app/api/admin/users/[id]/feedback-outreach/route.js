import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { sendActiveClientFeedbackOutreachEmail } from "@/lib/email";

/** POST: send feedback + paid subscription outreach email to an active portal client. */
export async function POST(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(id)
      .select("_id email shopName contactName lastLoginAt")
      .lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!user.lastLoginAt) {
      return NextResponse.json(
        { error: "This user has not signed in yet. Use the Clients page for outreach." },
        { status: 400 }
      );
    }
    if (!user.email?.trim()) {
      return NextResponse.json({ error: "User has no email address." }, { status: 400 });
    }

    const result = await sendActiveClientFeedbackOutreachEmail({
      to: user.email.trim(),
      contactName: user.contactName || "",
      shopName: user.shopName || "",
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, email: user.email.trim() });
  } catch (err) {
    console.error("Admin feedback outreach email error:", err);
    return NextResponse.json({ error: err.message || "Failed to send email" }, { status: 500 });
  }
}
