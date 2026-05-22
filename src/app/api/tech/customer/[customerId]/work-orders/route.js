import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
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
    const customerId = decodeURIComponent(String(params?.customerId || "").trim());
    if (!customerId || !mongoose.isValidObjectId(customerId)) {
      return NextResponse.json({ error: "Valid customer ID required" }, { status: 400 });
    }

    await connectDB();
    const customer = await Customer.findOne({
      _id: customerId,
      createdByEmail: tech.shopEmail,
    })
      .select({ companyName: 1, primaryContactName: 1 })
      .lean();

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const assigneeId = String(tech.employeeId || "").trim();
    const list = assigneeId
      ? await WorkOrder.find({
          createdByEmail: tech.shopEmail,
          customerId,
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
      quoteRfqNumber: w.quoteRfqNumber || "",
      repairJobNumber: w.repairJobNumber || "",
      motorClass: w.motorClass || "",
      date: w.date || "",
    }));

    const customerName =
      (customer.companyName && String(customer.companyName).trim()) ||
      (customer.primaryContactName && String(customer.primaryContactName).trim()) ||
      "";

    return NextResponse.json({
      customer: {
        id: customerId,
        name: customerName,
      },
      workOrders,
    });
  } catch (err) {
    console.error("Tech customer work orders:", err);
    return NextResponse.json({ error: "Failed to load work orders" }, { status: 500 });
  }
}
