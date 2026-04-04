import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { sendCrmQuoteToCustomer } from "@/lib/crm-quote-send-customer";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Quote ID required" }, { status: 400 });
    }

    const result = await sendCrmQuoteToCustomer({ quoteId: id, user, request });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 500 });
    }

    return NextResponse.json({
      ok: true,
      message: result.message,
      quote: result.quote,
    });
  } catch (err) {
    console.error("Quote send error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to send quote" },
      { status: 500 }
    );
  }
}
