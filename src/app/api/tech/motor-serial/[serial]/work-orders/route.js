import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Motor from "@/models/Motor";
import WorkOrder from "@/models/WorkOrder";
import { getTechnicianFromRequest } from "@/lib/auth-portal";
import { isWorkOrderOpenStatus } from "@/lib/work-order-open-status";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request, context) {
  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const serialRaw = decodeURIComponent(String(params?.serial || "").trim());
    if (!serialRaw) {
      return NextResponse.json({ error: "Serial number required" }, { status: 400 });
    }

    await connectDB();
    const rx = new RegExp(`^${escapeRegex(serialRaw)}$`, "i");
    const motors = await Motor.find({
      createdByEmail: tech.shopEmail,
      serialNumber: rx,
    })
      .select({ _id: 1, serialNumber: 1, manufacturer: 1, model: 1 })
      .lean();

    if (!motors.length) {
      return NextResponse.json(
        { error: "No motor found with this serial number in your shop." },
        { status: 404 }
      );
    }

    const motorIds = motors.map((m) => m._id.toString());
    const assigneeId = String(tech.employeeId || "").trim();
    const list = assigneeId
      ? await WorkOrder.find({
          createdByEmail: tech.shopEmail,
          motorId: { $in: motorIds },
          technicianEmployeeId: assigneeId,
        })
          .sort({ workOrderNumber: 1 })
          .lean()
      : [];

    const openOnly = list.filter((w) => isWorkOrderOpenStatus(w.status));

    const workOrders = openOnly.map((w) => ({
      id: w._id.toString(),
      workOrderNumber: w.workOrderNumber || "",
      status: w.status || "",
      companyName: w.companyName || "",
      quoteRfqNumber: w.quoteRfqNumber || "",
      motorClass: w.motorClass || "",
      date: w.date || "",
    }));

    const primary = motors[0];
    return NextResponse.json({
      motor: {
        id: primary._id.toString(),
        serialNumber: primary.serialNumber || serialRaw,
        manufacturer: primary.manufacturer || "",
        model: primary.model || "",
        matchCount: motors.length,
      },
      workOrders,
    });
  } catch (err) {
    console.error("Tech motor serial work orders:", err);
    return NextResponse.json({ error: "Failed to load work orders" }, { status: 500 });
  }
}
