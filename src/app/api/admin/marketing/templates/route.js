import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MarketingTemplate from "@/models/MarketingTemplate";
import { getAdminFromRequest } from "@/lib/auth-admin";

const DEFAULT_INITIAL = {
  type: "initial",
  subject: "List your motor repair shop on MotorsWinding.com",
  body: `<div style="font-family: sans-serif; max-width: 560px; line-height: 1.5;">
<p style="margin: 0 0 1em 0;">Hi,</p>
<p style="margin: 0 0 1em 0;">We’d like to invite you to list your motor repair shop on <strong>MotorsWinding.com</strong> so customers in your area can find you.</p>
<ul style="margin: 1em 0; padding-left: 1.25em;">
<li>Listing is <strong>free</strong></li>
<li>Add your services and get more leads</li>
<li>Manage your presence in one place</li>
</ul>
<p style="margin: 1.25em 0;">
<a href="https://motorswinding.com/list-your-electric-motor-services" style="display: inline-block; padding: 10px 18px; background: #9a5d33; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">List your shop</a>
</p>
<p style="margin: 1.5em 0 0 0; font-size: 13px; color: #64748b;">— MotorsWinding.com</p>
<hr style="margin: 1.5em 0; border: none; border-top: 1px solid #e2e8f0;" />
<p style="margin: 0; font-size: 12px; color: #94a3b8;">Don’t want to receive these emails? <a href="{{unsubscribe_url}}" style="color: #64748b;">Unsubscribe</a>.</p>
</div>`,
};

const DEFAULT_FOLLOWUP = {
  type: "followup",
  subject: "Quick follow-up – list your motor repair shop",
  body: `<div style="font-family: sans-serif; max-width: 560px; line-height: 1.5;">
<p style="margin: 0 0 1em 0;">Hi,</p>
<p style="margin: 0 0 1em 0;">Just following up on our previous message about listing your shop on <strong>MotorsWinding.com</strong>.</p>
<p style="margin: 0 0 1em 0;">If you have a moment, you can add your shop here—it’s free and only takes a few minutes.</p>
<p style="margin: 1.25em 0;">
<a href="https://motorswinding.com/list-your-electric-motor-services" style="display: inline-block; padding: 10px 18px; background: #9a5d33; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">List your shop</a>
</p>
<p style="margin: 1.5em 0 0 0; font-size: 13px; color: #64748b;">— MotorsWinding.com</p>
<hr style="margin: 1.5em 0; border: none; border-top: 1px solid #e2e8f0;" />
<p style="margin: 0; font-size: 12px; color: #94a3b8;">Don’t want to receive these emails? <a href="{{unsubscribe_url}}" style="color: #64748b;">Unsubscribe</a>.</p>
</div>`,
};

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const initial = await MarketingTemplate.findOne({ type: "initial" }).lean();
    const followup = await MarketingTemplate.findOne({ type: "followup" }).lean();
    return NextResponse.json({
      initial: initial || DEFAULT_INITIAL,
      followup: followup || DEFAULT_FOLLOWUP,
    });
  } catch (err) {
    console.error("Marketing templates get error:", err);
    return NextResponse.json({ error: err.message || "Failed to load" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const body = await request.json();
    const { initial, followup } = body;
    if (initial) {
      await MarketingTemplate.findOneAndUpdate(
        { type: "initial" },
        { $set: { subject: initial.subject || "", body: initial.body || "" } },
        { upsert: true, new: true }
      );
    }
    if (followup) {
      await MarketingTemplate.findOneAndUpdate(
        { type: "followup" },
        { $set: { subject: followup.subject || "", body: followup.body || "" } },
        { upsert: true, new: true }
      );
    }
    const initialDoc = await MarketingTemplate.findOne({ type: "initial" }).lean();
    const followupDoc = await MarketingTemplate.findOne({ type: "followup" }).lean();
    return NextResponse.json({
      ok: true,
      initial: initialDoc || DEFAULT_INITIAL,
      followup: followupDoc || DEFAULT_FOLLOWUP,
    });
  } catch (err) {
    console.error("Marketing templates update error:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
