import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth-admin";
import {
  sendTalentInviteEmail,
  TALENT_INVITE_DEFAULT_SUBJECT,
} from "@/lib/talent-email";

function parseEmails(raw) {
  return String(raw || "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@") && e.includes("."));
}

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const emails = parseEmails(body.to || body.email);
    if (!emails.length) {
      return NextResponse.json({ error: "Enter at least one valid email." }, { status: 400 });
    }
    if (emails.length > 25) {
      return NextResponse.json({ error: "Send at most 25 invites at once." }, { status: 400 });
    }

    const subject = String(body.subject || TALENT_INVITE_DEFAULT_SUBJECT).trim().slice(0, 200);
    const bodyText = String(body.bodyText || body.body || "").trim();
    if (!bodyText) {
      return NextResponse.json({ error: "Message body is required." }, { status: 400 });
    }

    const sent = [];
    const failed = [];
    for (const email of emails) {
      try {
        await sendTalentInviteEmail({
          to: email,
          subject,
          bodyText,
          request,
        });
        sent.push(email);
      } catch (err) {
        console.error("Talent invite send failed:", email, err);
        failed.push({ email, error: err.message || "Send failed" });
      }
    }

    if (!sent.length) {
      return NextResponse.json(
        { error: failed[0]?.error || "Could not send invites.", failed },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      message:
        failed.length > 0
          ? `Sent ${sent.length}, failed ${failed.length}.`
          : `Sent ${sent.length} invite(s).`,
    });
  } catch (err) {
    console.error("Admin talent invite error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
