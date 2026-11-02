import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Quote from "@/models/Quote";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { getMotorTagPrintContextForQuote } from "@/lib/quote-motor-tag-print";

function getParams(context) {
  return typeof context.params?.then === "function" ? context.params : context.params || {};
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const quote = await Quote.findOne({ _id: id, createdByEmail: email }).lean();
    if (!quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ctx = await getMotorTagPrintContextForQuote(quote, email);
    return NextResponse.json(ctx);
  } catch (err) {
    console.error("quote motor-tag GET:", err);
    return NextResponse.json({ error: "Failed to load tag data" }, { status: 500 });
  }
}
