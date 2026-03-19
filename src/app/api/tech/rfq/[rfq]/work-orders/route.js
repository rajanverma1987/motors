import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Quote from "@/models/Quote";
import WorkOrder from "@/models/WorkOrder";
import { getTechnicianFromRequest } from "@/lib/auth-portal";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const rfqRaw = params?.rfq;
    const rfqNumber = decodeURIComponent(String(rfqRaw || "").trim());
    if (!rfqNumber) {
      return NextResponse.json({ error: "RFQ number required" }, { status: 400 });
    }

    await connectDB();
    const quote = await Quote.findOne({
      createdByEmail: tech.shopEmail,
      rfqNumber,
    })
      .select({ _id: 1, rfqNumber: 1, status: 1, customerId: 1, motorId: 1 })
      .lean();

    if (!quote) {
      return NextResponse.json({ error: "No quote found for this RFQ number." }, { status: 404 });
    }

    const quoteId = quote._id.toString();
    const assigneeId = String(tech.employeeId || "").trim();
    const list = assigneeId
      ? await WorkOrder.find({
          createdByEmail: tech.shopEmail,
          quoteId,
          technicianEmployeeId: assigneeId,
        })
          .sort({ workOrderNumber: 1 })
          .lean()
      : [];

    const workOrders = list.map((w) => ({
      id: w._id.toString(),
      workOrderNumber: w.workOrderNumber || "",
      status: w.status || "",
      companyName: w.companyName || "",
      quoteRfqNumber: w.quoteRfqNumber || rfqNumber,
      motorClass: w.motorClass || "",
      date: w.date || "",
    }));

    return NextResponse.json({
      quote: {
        id: quoteId,
        rfqNumber: quote.rfqNumber || rfqNumber,
        status: quote.status || "",
      },
      workOrders,
    });
  } catch (err) {
    console.error("Tech RFQ work orders:", err);
    return NextResponse.json({ error: "Failed to load work orders" }, { status: 500 });
  }
}
