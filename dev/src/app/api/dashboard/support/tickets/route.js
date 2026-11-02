import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SupportTicket from "@/models/SupportTicket";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString } from "@/lib/validation";
import {
  allocateSupportTicketNumber,
  normalizeCategory,
  normalizeSupportAttachments,
  ticketToListRow,
} from "@/lib/support-tickets";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const list = await SupportTicket.find({ createdByEmail: email }).sort({ updatedAt: -1 }).lean();
    return NextResponse.json(list.map(ticketToListRow));
  } catch (err) {
    console.error("Support tickets list (portal):", err);
    return NextResponse.json({ error: "Failed to list tickets" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const subject = clampString(body?.subject, 200).trim();
    const description = clampString(body?.description, LIMITS.message.max).trim();
    if (!subject) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const ticketNumber = await allocateSupportTicketNumber();
    const attachments = normalizeSupportAttachments(body?.attachments);
    const doc = await SupportTicket.create({
      ticketNumber,
      createdByEmail: email,
      shopName: clampString(user.shopName, LIMITS.companyName.max),
      contactName: clampString(user.contactName, LIMITS.name.max),
      category: normalizeCategory(body?.category),
      subject,
      description,
      attachments,
      status: "open",
      replies: [],
    });
    return NextResponse.json({ ok: true, ticket: ticketToListRow(doc) });
  } catch (err) {
    console.error("Support ticket create (portal):", err);
    return NextResponse.json({ error: err.message || "Failed to create ticket" }, { status: 500 });
  }
}
