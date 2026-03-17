import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
import Motor from "@/models/Motor";
import Quote from "@/models/Quote";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

/**
 * GET /api/portal/[token]
 * Public. Returns customer name, motors, and quotes for the customer portal view.
 */
export async function GET(request, context) {
  try {
    const params = await getParams(context);
    const token = params?.token?.trim();
    if (!token) {
      return NextResponse.json({ error: "Invalid link" }, { status: 400 });
    }
    await connectDB();
    const customer = await Customer.findOne({ portalToken: token }).lean();
    if (!customer) {
      return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });
    }
    const customerId = customer._id.toString();
    const [motors, quotes] = await Promise.all([
      Motor.find({ customerId, createdByEmail: customer.createdByEmail })
        .sort({ createdAt: -1 })
        .lean(),
      Quote.find({ customerId, createdByEmail: customer.createdByEmail })
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    const customerName =
      [customer.primaryContactName, customer.companyName].filter(Boolean).join(" – ") ||
      customer.companyName ||
      "Customer";
    return NextResponse.json({
      customer: {
        name: customerName,
        companyName: customer.companyName ?? "",
      },
      motors: motors.map((m) => ({
        id: m._id.toString(),
        serialNumber: m.serialNumber ?? "",
        manufacturer: m.manufacturer ?? "",
        model: m.model ?? "",
        hp: m.hp ?? "",
        rpm: m.rpm ?? "",
        voltage: m.voltage ?? "",
        frameSize: m.frameSize ?? "",
        motorType: m.motorType ?? "",
      })),
      quotes: quotes.map((q) => ({
        id: q._id.toString(),
        rfqNumber: q.rfqNumber ?? "",
        status: q.status ?? "",
        date: q.date ?? "",
        estimatedCompletion: q.estimatedCompletion ?? "",
        motorId: q.motorId ?? "",
        laborTotal: q.laborTotal ?? "",
        partsTotal: q.partsTotal ?? "",
      })),
    });
  } catch (err) {
    console.error("Portal view error:", err);
    return NextResponse.json({ error: "Failed to load portal" }, { status: 500 });
  }
}
