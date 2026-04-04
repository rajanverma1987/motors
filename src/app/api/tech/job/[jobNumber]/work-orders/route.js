import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Quote from "@/models/Quote";
import WorkOrder from "@/models/WorkOrder";
import MotorRepairJob from "@/models/MotorRepairJob";
import { getTechnicianFromRequest } from "@/lib/auth-portal";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request, context) {
  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const raw = params?.jobNumber;
    const jobNumber = decodeURIComponent(String(raw || "").trim());
    if (!jobNumber) {
      return NextResponse.json({ error: "Job number required" }, { status: 400 });
    }

    await connectDB();
    const job = await MotorRepairJob.findOne({
      createdByEmail: tech.shopEmail,
      jobNumber: new RegExp(`^${escapeRegex(jobNumber)}$`, "i"),
    })
      .select({ _id: 1, jobNumber: 1, phase: 1 })
      .lean();

    if (!job) {
      return NextResponse.json({ error: "No job found for this job number." }, { status: 404 });
    }

    const jobIdStr = job._id.toString();
    const quoteRows = await Quote.find({
      createdByEmail: tech.shopEmail,
      repairFlowJobId: jobIdStr,
    })
      .select({ _id: 1 })
      .lean();
    const quoteIds = quoteRows.map((q) => String(q._id));

    const assigneeId = String(tech.employeeId || "").trim();
    const orClause = [{ repairFlowJobId: jobIdStr }];
    if (quoteIds.length) orClause.push({ quoteId: { $in: quoteIds } });

    const list = assigneeId
      ? await WorkOrder.find({
          createdByEmail: tech.shopEmail,
          technicianEmployeeId: assigneeId,
          $or: orClause,
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
      repairJobNumber: w.repairJobNumber || job.jobNumber || "",
      motorClass: w.motorClass || "",
      date: w.date || "",
    }));

    return NextResponse.json({
      job: {
        id: jobIdStr,
        jobNumber: job.jobNumber || jobNumber,
        phase: job.phase || "",
      },
      workOrders,
    });
  } catch (err) {
    console.error("Tech job work orders:", err);
    return NextResponse.json({ error: "Failed to load work orders" }, { status: 500 });
  }
}
