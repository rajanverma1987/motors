import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { buildInvoiceSendEmailPreview } from "@/lib/customer-send-email-preview";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
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

    const result = await buildInvoiceSendEmailPreview({ invoiceId: id, user, request });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }
    return NextResponse.json({ ok: true, preview: result.preview });
  } catch (err) {
    console.error("Invoice send preview:", err);
    return NextResponse.json({ error: err.message || "Failed to load preview" }, { status: 500 });
  }
}
