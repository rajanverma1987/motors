import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WorkOrder from "@/models/WorkOrder";
import { getTechnicianFromRequest } from "@/lib/auth-portal";
import { isWorkOrderOpenStatus } from "@/lib/work-order-open-status";

export async function GET(request) {
  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const assigneeId = String(tech.employeeId || "").trim();
    if (!assigneeId) {
      return NextResponse.json({ workOrders: [] });
    }

    await connectDB();
    const list = await WorkOrder.find({
      createdByEmail: tech.shopEmail,
      technicianEmployeeId: assigneeId,
    })
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    const workOrders = list
      .filter((w) => isWorkOrderOpenStatus(w.status))
      .map((w) => ({
        id: w._id.toString(),
        workOrderNumber: w.workOrderNumber || "",
        status: w.status || "",
        companyName: w.companyName || "",
        quoteRfqNumber: w.quoteRfqNumber || "",
        motorClass: w.motorClass || "",
        date: w.date || "",
        updatedAt: w.updatedAt ? new Date(w.updatedAt).toISOString() : null,
      }));

    return NextResponse.json({ workOrders });
  } catch (err) {
    console.error("Tech my work orders:", err);
    return NextResponse.json({ error: "Failed to load work orders" }, { status: 500 });
  }
}
